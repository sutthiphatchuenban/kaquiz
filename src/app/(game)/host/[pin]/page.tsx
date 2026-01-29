"use client";

import { useState, useEffect, use, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/stores/auth-store";
import { useSocket } from "@/hooks/use-socket";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
    Sparkles,
    Users,
    Play,
    ChevronRight,
    Trophy,
    Loader2,
    Check,
    X,
    SkipForward,
    Volume2,
    VolumeX,
    Music
} from "lucide-react";
import { toast } from "sonner";

import { audioSynth } from "@/utils/audio-synth";


// Utility for coloring
const getColorClass = (color: string) => {
    const colors: Record<string, string> = {
        red: "bg-[var(--answer-red)] shadow-[0_6px_0_var(--destructive)]",
        blue: "bg-[var(--answer-blue)] shadow-[0_6px_0_#2b87d1]",
        green: "bg-[var(--answer-green)] shadow-[0_6px_0_#4aa523]",
        yellow: "bg-[var(--answer-yellow)] shadow-[0_6px_0_#d95600]",
    };
    return colors[color] || colors.red;
};

interface Answer {
    id: string;
    answerText: string;
    color: string;
    order: number;
    isCorrect?: boolean;
}

interface Question {
    id: string;
    questionText: string;
    type: string;
    timeLimit: number;
    points: number;
    answers: Answer[];
}

interface Quiz {
    title: string;
    questions: Question[];
}

interface Player {
    id: string;
    nickname: string;
    score: number;
}

interface GameData {
    status: string;
    currentQuestionIndex: number;
    quiz: Quiz;
    players: Player[];
}

export default function HostGamePage({ params }: { params: Promise<{ pin: string }> }) {
    const { pin } = use(params);
    const router = useRouter();
    const { isAuthenticated, isLoading: authLoading, checkAuth } = useAuthStore();
    const {
        isConnected,
        createRoom,
        startGame: socketStartGame,
        nextQuestion: socketNextQuestion,
        showAnswer: socketShowAnswer,
        showLeaderboard: socketShowLeaderboard,
        endGame: socketEndGame,
        onPlayerJoined,
        onAnswerReceived,
    } = useSocket();

    const [gameData, setGameData] = useState<GameData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isUpdating, setIsUpdating] = useState(false);
    const [timeRemaining, setTimeRemaining] = useState(0);
    const [answeredCount, setAnsweredCount] = useState(0);
    const [isMuted, setIsMuted] = useState(false);

    // Sound Management
    const playSound = useCallback((type: "lobby" | "countdown" | "question" | "reveal" | "win" | "join", loop = false) => {
        if (isMuted) return;

        // Map types to synth methods
        switch (type) {
            case "lobby":
                audioSynth.playLobbyBGM();
                break;
            case "question":
                audioSynth.playQuestionBGM();
                break;
            case "join":
                audioSynth.playJoin();
                break;
            case "countdown":
                audioSynth.playCountdown();
                break;
            case "reveal":
                audioSynth.playReveal();
                break;
            case "win":
                audioSynth.playWin();
                break;
        }
    }, [isMuted]);

    const toggleMute = () => {
        setIsMuted(!isMuted);
        audioSynth.toggleMute(!isMuted);
    };

    useEffect(() => {
        checkAuth();
    }, [checkAuth]);

    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            router.push("/login");
        }
    }, [authLoading, isAuthenticated, router]);

    // Create socket room when game loads or reconnects
    useEffect(() => {
        if (isAuthenticated && pin && isConnected) {
            createRoom(pin);
            fetchGame();
        }
    }, [isAuthenticated, pin, isConnected, createRoom]);

    // Socket event listeners
    useEffect(() => {
        const unsubPlayerJoined = onPlayerJoined(({ nickname }) => {
            playSound("join");
            toast.success(`${nickname} เข้าร่วมแล้ว!`);
            fetchGame(); // Refresh player list
        });

        const unsubAnswerReceived = onAnswerReceived(() => {
            setAnsweredCount((prev) => prev + 1);
        });

        return () => {
            unsubPlayerJoined();
            unsubAnswerReceived();
        };
    }, [onPlayerJoined, onAnswerReceived, playSound]);

    useEffect(() => {
        if (isAuthenticated && pin) {
            fetchGame();
        }
    }, [isAuthenticated, pin]);

    // Timer effect
    useEffect(() => {
        let timer: NodeJS.Timeout;

        if (gameData?.status === "QUESTION" && timeRemaining > 0) {
            timer = setInterval(() => {
                setTimeRemaining((prev) => {
                    if (prev <= 1) {
                        handleShowAnswer();
                        return 0;
                    }
                    if (prev <= 5) { // Beep on last 5 seconds
                        audioSynth.playCountdown();
                    }
                    return prev - 1;
                });
            }, 1000);
        }

        return () => {
            if (timer) clearInterval(timer);
        };
    }, [gameData?.status, timeRemaining, playSound]);

    // Poll for players and answers
    useEffect(() => {
        let pollInterval: NodeJS.Timeout;

        if (gameData?.status === "LOBBY" || gameData?.status === "QUESTION") {
            pollInterval = setInterval(async () => {
                await fetchGame();
            }, 1500);
        }

        return () => {
            if (pollInterval) clearInterval(pollInterval);
        };
    }, [gameData?.status, pin]);

    const [isAutoPlay, setIsAutoPlay] = useState(false);
    const [joinUrl, setJoinUrl] = useState("");

    useEffect(() => {
        if (typeof window !== 'undefined') {
            setJoinUrl(`${window.location.origin}/join?pin=${pin}`);
        }
    }, [pin]);

    // ... existing timer ...

    // Auto Play Logic
    useEffect(() => {
        if (!isAutoPlay || !gameData) return;

        let autoTimer: NodeJS.Timeout;

        if (gameData.status === "SHOWING_ANSWER") {
            // Wait 3 seconds then go to Leaderboard
            autoTimer = setTimeout(() => {
                handleShowLeaderboard();
            }, 3000);
        } else if (gameData.status === "LEADERBOARD") {
            // Wait 3 seconds then go to Next Question
            autoTimer = setTimeout(() => {
                handleNextQuestion();
            }, 3000);
        }

        return () => {
            if (autoTimer) clearTimeout(autoTimer);
        };
    }, [isAutoPlay, gameData?.status]); // Add specific dependencies if needed

    // Auto Skip if all answered
    useEffect(() => {
        if (gameData?.status === "QUESTION" && gameData?.players?.length > 0) {
            // Check if all players have answered
            if (answeredCount >= gameData.players.length) {
                const timer = setTimeout(() => {
                    handleShowAnswer();
                }, 1000);
                return () => clearTimeout(timer);
            }
        }
    }, [gameData?.status, answeredCount, gameData?.players?.length]);


    // Handle Game State Changes for Audio
    useEffect(() => {
        if (!gameData) return;

        if (gameData.status === "LOBBY") {
            playSound("lobby");
        } else if (gameData.status === "QUESTION") {
            playSound("question");
        } else if (gameData.status === "SHOWING_ANSWER") {
            audioSynth.stopBGM(); // Stop music for reveal
            playSound("reveal");
        } else if (gameData.status === "FINISHED") {
            playSound("win");
        } else if (gameData.status === "LEADERBOARD") {
            audioSynth.stopBGM();
        }
    }, [gameData?.status, playSound]);

    const fetchGame = async () => {
        try {
            const res = await fetch(`/api/games/${pin}/host`);
            const data = await res.json();

            if (data.success) {
                setGameData(data.data);
            } else {
                toast.error("ไม่พบเกมนี้");
                router.push("/quizzes");
            }
        } catch {
            // Silent fail
        } finally {
            setIsLoading(false);
        }
    };

    const updateGameStatus = async (newStatus: string, questionIndex?: number) => {
        setIsUpdating(true);
        try {
            const res = await fetch(`/api/games/${pin}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    status: newStatus,
                    currentQuestionIndex: questionIndex,
                }),
            });
            const data = await res.json();

            if (data.success) {
                setGameData(data.data);
                return true;
            } else {
                toast.error(data.error);
                return false;
            }
        } catch {
            toast.error("เกิดข้อผิดพลาด");
            return false;
        } finally {
            setIsUpdating(false);
        }
    };

    const handleStartGame = async () => {
        if (!gameData || gameData.quiz.questions.length === 0) {
            toast.error("Quiz ต้องมีคำถามอย่างน้อย 1 ข้อ");
            return;
        }
        const success = await updateGameStatus("QUESTION", 0);
        if (success) {
            socketStartGame(pin);
            socketNextQuestion(pin, 0);
            setTimeRemaining(gameData.quiz.questions[0].timeLimit);
            setAnsweredCount(0);
        }
    };

    const handleShowAnswer = useCallback(async () => {
        if (isUpdating) return;
        const success = await updateGameStatus("SHOWING_ANSWER");
        if (success) {
            socketShowAnswer(pin);
        }
    }, [isUpdating, pin, socketShowAnswer]);

    const handleShowLeaderboard = async () => {
        const success = await updateGameStatus("LEADERBOARD");
        if (success) {
            socketShowLeaderboard(pin);
            await fetchGame();
        }
    };

    const handleNextQuestion = async () => {
        if (!gameData) return;

        const nextIndex = gameData.currentQuestionIndex + 1;

        if (nextIndex >= gameData.quiz.questions.length) {
            const success = await updateGameStatus("FINISHED");
            if (success) {
                socketEndGame(pin);
            }
        } else {
            const success = await updateGameStatus("QUESTION", nextIndex);
            if (success) {
                socketNextQuestion(pin, nextIndex);
                setTimeRemaining(gameData.quiz.questions[nextIndex].timeLimit);
                setAnsweredCount(0);
            }
        }
    };

    if (authLoading || isLoading) {
        return (
            <div className="min-h-screen game-bg flex items-center justify-center">
                <Loader2 className="w-16 h-16 animate-spin text-white drop-shadow-lg" />
            </div>
        );
    }

    if (!gameData) return null;

    const currentQuestion = gameData.quiz.questions[gameData.currentQuestionIndex];

    return (
        <div className="min-h-screen game-bg text-white font-sans overflow-hidden relative">
            {/* Background Blobs */}
            <div className="blob blob-1"></div>
            <div className="blob blob-2"></div>
            <div className="blob blob-3"></div>
            <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-10 mix-blend-overlay"></div>

            {/* Audio Control */}
            <div className="fixed top-6 right-6 z-50 flex gap-4">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsAutoPlay(!isAutoPlay)}
                    className={`glass-panel rounded-full w-12 h-12 transition-all ${isAutoPlay ? 'bg-green-500/50 text-white' : 'text-white/50 hover:bg-white/20'}`}
                    title={isAutoPlay ? "Auto Play ON" : "Auto Play OFF"}
                >
                    {isAutoPlay ? <Play className="w-6 h-6 animate-pulse" /> : <Play className="w-6 h-6 opacity-50" />}
                </Button>

                <Button variant="ghost" size="icon" onClick={toggleMute} className="text-white hover:bg-white/20 glass-panel rounded-full w-12 h-12">
                    {isMuted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
                </Button>
            </div>

            {/* LOBBY */}
            {gameData.status === "LOBBY" && (
                <div className="h-screen w-full flex flex-col items-center justify-between p-4 md:p-6 relative z-10 overflow-hidden">
                    {/* Header Section */}
                    <div className="w-full max-w-5xl animate-float text-center pt-4 flex-shrink-0">
                        <div className="mb-4 glass-card rounded-2xl p-4 md:p-8 relative overflow-hidden border-t-white/30 mx-auto max-w-3xl">
                            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500"></div>
                            <h1 className="text-2xl sm:text-3xl md:text-5xl font-black mb-2 tracking-tight drop-shadow-xl break-words line-clamp-2">
                                {gameData.quiz.title}
                            </h1>
                            <p className="text-base md:text-xl text-white/90 font-light px-4">
                                เข้าร่วมที่ <span className="font-mono font-bold text-cyan-300 bg-black/30 px-2 py-0.5 rounded-lg border border-cyan-500/30 inline-block">kaquiz.com/join</span>
                            </p>
                        </div>

                        <div className="my-4 animate-bounce-in transform scale-90 md:scale-100 origin-center flex flex-col md:flex-row items-center justify-center gap-6 md:gap-12">
                            {/* QR Code */}
                            {joinUrl && (
                                <div className="bg-white p-2 rounded-xl shadow-2xl rotate-[-3deg] hover:rotate-0 transition-transform duration-300">
                                    <img
                                        src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(joinUrl)}`}
                                        alt="Join QR Code"
                                        className="w-24 h-24 md:w-32 md:h-32"
                                    />
                                </div>
                            )}

                            {/* PIN Box */}
                            <div className="bg-white text-black p-4 md:p-8 rounded-[1.5rem] inline-block shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative rotate-[2deg] hover:rotate-0 transition-transform duration-300">
                                <span className="absolute -top-3 -right-3 rotate-12 bg-yellow-400 text-black font-bold px-3 py-1 rounded-lg shadow-lg text-xs md:text-sm">JOIN NOW!</span>
                                <p className="text-sm md:text-lg font-bold mb-1 uppercase tracking-widest text-gray-500">Game PIN</p>
                                <p className="text-5xl md:text-7xl font-black tracking-widest font-mono text-transparent bg-clip-text bg-gradient-to-br from-indigo-600 to-purple-700">
                                    {pin}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Players Scrollable Area */}
                    <div className="flex-1 w-full max-w-6xl mx-auto overflow-y-auto min-h-0 my-4 px-2">
                        <div className="flex flex-wrap justify-center content-start gap-3">
                            {gameData.players.map((player) => (
                                <div key={player.id} className="animate-in fade-in zoom-in duration-300">
                                    <Badge className="text-sm md:text-lg py-2 px-4 bg-black/40 hover:bg-white/20 backdrop-blur-md border border-white/10 shadow-lg text-white rounded-lg transition-all hover:-translate-y-1 max-w-[180px] truncate">
                                        <div className="w-2 h-2 rounded-full bg-green-400 mr-2 animate-pulse flex-shrink-0"></div>
                                        {player.nickname}
                                    </Badge>
                                </div>
                            ))}
                            {gameData.players.length === 0 && (
                                <div className="flex flex-col items-center justify-center opacity-60 animate-pulse w-full py-8">
                                    <Loader2 className="w-8 h-8 md:w-10 md:h-10 mb-2 animate-spin-slow" />
                                    <p className="text-lg md:text-xl font-medium">Waiting for players...</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="w-full glass-panel border-t border-white/10 flex items-center justify-between p-4 md:p-6 backdrop-blur-xl z-20 flex-shrink-0 mt-auto rounded-t-2xl">
                        <div className="flex items-center gap-3">
                            <div className="bg-white/10 p-2 rounded-full">
                                <Users className="w-6 h-6" />
                            </div>
                            <div className="text-left leading-tight">
                                <p className="text-[10px] md:text-xs text-white/60 uppercase font-bold tracking-wider">Players</p>
                                <span className="text-xl md:text-2xl font-black">{gameData.players.length}</span>
                            </div>
                        </div>

                        <Button
                            size="lg"
                            onClick={handleStartGame}
                            disabled={gameData.players.length === 0 || isUpdating}
                            className="h-14 md:h-16 px-8 md:px-12 text-xl md:text-2xl font-black rounded-xl bg-gradient-to-r from-pink-500 to-violet-600 hover:from-pink-400 hover:to-violet-500 text-white shadow-[0_0_30px_rgba(168,85,247,0.4)] border-none btn-juicy"
                        >
                            {isUpdating ? <Loader2 className="w-6 h-6 animate-spin" /> : "START GAME"}
                        </Button>
                    </div>
                </div>
            )}

            {/* QUESTION */}
            {/* QUESTION */}
            {gameData.status === "QUESTION" && currentQuestion && (
                <div className="h-screen flex flex-col p-4 md:p-6 pb-20 relative z-10 overflow-hidden">
                    {/* Header */}
                    <div className="flex justify-between items-center mb-4 flex-shrink-0">
                        <Badge variant="outline" className="text-base md:text-lg bg-black/30 border-white/20 text-white px-4 py-2 backdrop-blur-md rounded-xl">
                            <span className="opacity-60 mr-2 hidden sm:inline">Question</span>
                            <span className="font-bold text-lg md:text-xl">{gameData.currentQuestionIndex + 1}</span>
                            <span className="opacity-60 mx-1 md:mx-2">/</span>
                            <span className="opacity-60">{gameData.quiz.questions.length}</span>
                        </Badge>

                        <div className="relative">
                            <div className="absolute inset-0 bg-purple-500 blur-xl opacity-40 animate-pulse"></div>
                            <div className="bg-black/40 backdrop-blur-md rounded-full w-16 h-16 md:w-20 md:h-20 flex items-center justify-center border-4 border-white/10 shadow-2xl relative z-10">
                                <span className={`text-2xl md:text-4xl font-black font-mono ${timeRemaining <= 5 ? "text-red-400 animate-pulse scale-110 transition-transform" : "text-white"}`}>
                                    {timeRemaining}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Question Content Container */}
                    <div className="flex-1 flex flex-col min-h-0 gap-4">
                        {/* Question Text */}
                        <div className="flex-shrink-0 flex items-center justify-center min-h-[15vh] max-h-[30vh]">
                            <div className="w-full max-w-5xl glass-card rounded-2xl p-4 md:p-8 text-center transform shadow-[0_10px_60px_rgba(0,0,0,0.5)] overflow-y-auto max-h-full">
                                <h2 className="text-xl sm:text-2xl lg:text-4xl font-bold leading-tight drop-shadow-lg break-words">
                                    {currentQuestion.questionText}
                                </h2>
                            </div>
                        </div>

                        {/* Answers Grid */}
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 max-w-7xl mx-auto w-full min-h-0">
                            {currentQuestion.answers.map((answer, idx) => (
                                <div key={answer.id} className={`answer-btn ${getColorClass(answer.color)} flex items-center p-3 md:p-4 relative overflow-hidden group rounded-xl border-b-4 border-black/20 btn-juicy shadow-xl min-h-0 h-full`}>
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                    <div className="absolute -right-4 -bottom-4 opacity-10 transform rotate-12 group-hover:scale-110 transition-transform duration-500 hidden sm:block">
                                        <div className="text-5xl md:text-7xl font-black">{["▲", "◆", "●", "■"][idx]}</div>
                                    </div>
                                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-black/20 flex items-center justify-center font-black text-lg md:text-xl shadow-inner mr-3 md:mr-4 z-10 flex-shrink-0">
                                        {["A", "B", "C", "D"][idx]}
                                    </div>
                                    <span className="text-base sm:text-lg lg:text-2xl font-bold text-shadow-sm drop-shadow-md z-10 break-words line-clamp-2 overflow-hidden flex-1">
                                        {answer.answerText}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Footer Progress & Status */}
                    <div className="fixed bottom-0 left-0 right-0 h-2 bg-black/60 shadow-inner z-20">
                        <div
                            className="h-full bg-gradient-to-r from-purple-500 to-pink-500 shadow-[0_0_20px_#a855f7]"
                            style={{ width: `${(timeRemaining / currentQuestion.timeLimit) * 100}%`, transition: "width 1s linear" }}
                        />
                    </div>

                    <div className="fixed bottom-4 right-4 glass-panel px-4 py-2 rounded-xl flex items-center gap-3 z-30 shadow-xl">
                        <div className="text-right">
                            <p className="text-[10px] uppercase text-white/50 font-bold tracking-widest">Answers</p>
                            <p className="text-lg font-black">
                                {answeredCount} <span className="text-sm text-white/40">/ {gameData.players.length}</span>
                            </p>
                        </div>
                        <Button variant="secondary" onClick={handleShowAnswer} className="h-10 w-10 rounded-full p-0 bg-white/10 hover:bg-white/20 border-none">
                            <SkipForward className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            )}

            {/* SHOWING ANSWER (REVEAL) */}
            {gameData.status === "SHOWING_ANSWER" && currentQuestion && (
                <div className="h-screen flex flex-col p-4 md:p-6 pb-20 relative z-10 overflow-hidden">
                    <div className="flex-1 flex flex-col items-center justify-center min-h-0 gap-6">
                        <div className="flex-shrink-0 w-full max-w-5xl flex items-center justify-center min-h-[10vh] max-h-[25vh]">
                            <h2 className="text-xl sm:text-2xl lg:text-4xl font-bold text-center drop-shadow-2xl opacity-80 break-words px-4 overflow-y-auto max-h-full">
                                {currentQuestion.questionText}
                            </h2>
                        </div>

                        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 w-full max-w-6xl min-h-0 px-2 lg:px-4">
                            {currentQuestion.answers.map((answer) => (
                                <div
                                    key={answer.id}
                                    className={`answer-btn ${getColorClass(answer.color)} rounded-xl p-4 md:p-6 flex items-center shadow-lg
                                    ${answer.isCorrect
                                            ? "ring-2 md:ring-4 ring-green-400 ring-offset-2 md:ring-offset-black scale-[1.02] z-20 opacity-100 shadow-[0_0_30px_rgba(74,222,128,0.5)]"
                                            : "opacity-30 scale-95 grayscale blur-[1px]"
                                        } transition-all duration-700 ease-out h-full min-h-0`}
                                >
                                    <div className="flex items-center justify-between w-full h-full gap-4">
                                        <span className="text-lg sm:text-xl lg:text-3xl font-bold break-words line-clamp-3 overflow-hidden">
                                            {answer.answerText}
                                        </span>
                                        <div className="flex-shrink-0">
                                            {answer.isCorrect ? (
                                                <div className="bg-white text-green-600 rounded-full p-1.5 md:p-2 shadow-lg animate-bounce-in">
                                                    <Check className="w-5 h-5 md:w-8 md:h-8 stroke-[4]" />
                                                </div>
                                            ) : (
                                                <div className="bg-black/20 text-white rounded-full p-1.5 md:p-2">
                                                    <X className="w-5 h-5 md:w-8 md:h-8" />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-center pb-4 md:pb-8 pt-4 animate-in slide-in-from-bottom duration-500 delay-500 z-20 flex-shrink-0">
                        <Button
                            size="lg"
                            onClick={handleShowLeaderboard}
                            disabled={isUpdating}
                            className="bg-white text-black hover:bg-gray-100 text-lg md:text-xl font-black px-8 md:px-12 h-14 md:h-16 rounded-xl shadow-[0_10px_30px_rgba(255,255,255,0.2)] btn-juicy"
                        >
                            <Trophy className="w-5 h-5 md:w-6 md:h-6 mr-2 text-yellow-500" />
                            NEXT
                        </Button>
                    </div>
                </div>
            )}

            {/* LEADERBOARD */}
            {gameData.status === "LEADERBOARD" && (
                <div className="h-screen flex flex-col p-4 md:p-6 items-center relative z-10 overflow-hidden">
                    <div className="mt-4 md:mt-8 mb-4 md:mb-6 relative flex-shrink-0">
                        <div className="absolute inset-0 bg-yellow-500 blur-3xl opacity-20"></div>
                        <h1 className="text-4xl sm:text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 to-yellow-600 drop-shadow-sm text-shadow-3d flex items-center gap-3 md:gap-4 px-4 text-center">
                            <Trophy className="w-8 h-8 md:w-16 md:h-16 text-yellow-400 drop-shadow-[0_0_20px_rgba(250,204,21,0.8)] hidden xs:block" />
                            TOP 5
                        </h1>
                    </div>

                    <div className="w-full max-w-4xl space-y-2 md:space-y-3 flex-1 overflow-y-auto px-4 pb-20 min-h-0">
                        {[...gameData.players]
                            .sort((a, b) => b.score - a.score)
                            .slice(0, 5)
                            .map((player, index) => (
                                <div
                                    key={player.id}
                                    className="flex items-center gap-3 md:gap-4 p-3 md:p-4 rounded-xl glass-card border-none hover:bg-white/10 transition-all transform hover:scale-[1.01] shadow-lg shrink-0"
                                    style={{ animationDelay: `${index * 150}ms` }}
                                >
                                    <div className={`w-10 h-10 md:w-14 md:h-14 rounded-lg md:rounded-xl flex-shrink-0 flex items-center justify-center text-lg md:text-2xl font-black text-white shadow-lg ${index === 0 ? "bg-gradient-to-br from-yellow-300 to-yellow-600 shadow-yellow-500/50" :
                                        index === 1 ? "bg-gradient-to-br from-gray-300 to-gray-500 shadow-gray-500/50" :
                                            index === 2 ? "bg-gradient-to-br from-orange-400 to-orange-700 shadow-orange-500/50" : "bg-white/10"
                                        }`}>
                                        {index + 1}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-lg md:text-2xl font-bold tracking-tight truncate">{player.nickname}</h3>
                                    </div>
                                    <div className="text-xl md:text-3xl font-black font-mono tracking-tighter text-cyan-300 drop-shadow-[0_0_10px_rgba(103,232,249,0.5)] flex-shrink-0">
                                        {player.score.toLocaleString()}
                                    </div>
                                </div>
                            ))}
                    </div>

                    <div className="fixed bottom-0 left-0 right-0 px-4 flex justify-center pb-6 pt-4 z-20 bg-gradient-to-t from-black/20 to-transparent">
                        <Button
                            size="lg"
                            onClick={handleNextQuestion}
                            disabled={isUpdating}
                            className="w-full max-w-sm bg-white text-black hover:bg-gray-100 text-lg md:text-xl font-black px-8 h-14 md:h-16 rounded-xl shadow-[0_10px_40px_rgba(255,255,255,0.15)] btn-juicy"
                        >
                            {gameData.currentQuestionIndex + 1 >= gameData.quiz.questions.length ? "Finish Game" : "Next Question"}
                            <ChevronRight className="w-5 h-5 md:w-6 md:h-6 ml-2" />
                        </Button>
                    </div>
                </div>
            )}

            {/* FINISHED */}
            {gameData.status === "FINISHED" && (
                <div className="h-screen flex flex-col items-center justify-between p-4 md:p-8 relative overflow-hidden z-10">
                    <div className="absolute inset-0 overflow-hidden pointer-events-none">
                        {[...Array(30)].map((_, i) => (
                            <div key={i} className="absolute w-3 h-3 md:w-5 md:h-5 rounded-sm animate-float"
                                style={{
                                    backgroundColor: ['#f00', '#0f0', '#00f', '#ff0', '#f0f', '#0ff'][Math.floor(Math.random() * 6)],
                                    top: `${Math.random() * 100}%`,
                                    left: `${Math.random() * 100}%`,
                                    animationDuration: `${3 + Math.random() * 4}s`,
                                    animationDelay: `-${Math.random() * 5}s`,
                                    opacity: 0.7
                                }}
                            />
                        ))}
                    </div>

                    <div className="flex-shrink-0 mt-4 md:mt-8">
                        <h1 className="text-4xl sm:text-6xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-br from-yellow-300 via-orange-400 to-red-500 drop-shadow-lg text-shadow-3d animate-bounce-in text-center px-4">
                            PODIUM
                        </h1>
                    </div>

                    <div className="flex-1 flex items-end justify-center w-full max-w-5xl px-2 min-h-0 pb-4">
                        <div className="flex items-end justify-center gap-2 sm:gap-4 md:gap-8 w-full h-[60vh] max-h-[500px]">
                            {(() => {
                                const sorted = [...gameData.players].sort((a, b) => b.score - a.score);
                                const topThree = sorted.slice(0, 3);
                                return (
                                    <>
                                        {/* 2nd Place */}
                                        {topThree[1] && (
                                            <div className="flex flex-col items-center w-1/3 animate-in slide-in-from-bottom duration-1000 delay-200 h-[70%] max-h-full min-w-0">
                                                <div className="relative mb-2 md:mb-4 flex-shrink-0 transform scale-75 md:scale-100 origin-bottom">
                                                    <div className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 rounded-full bg-gray-300 border-2 md:border-4 border-white shadow-[0_0_20px_rgba(255,255,255,0.4)] flex items-center justify-center z-10 relative">
                                                        <span className="text-3xl sm:text-4xl">🥈</span>
                                                    </div>
                                                </div>
                                                <div className="flex-1 w-full bg-gradient-to-t from-gray-900/80 to-gray-700/80 rounded-t-xl md:rounded-t-2xl backdrop-blur-md border-t border-white/20 flex flex-col items-center pt-3 md:pt-4 shadow-2xl min-w-0">
                                                    <p className="font-bold text-sm sm:text-lg lg:text-2xl text-white mb-1 px-2 text-center truncate w-full">{topThree[1].nickname}</p>
                                                    <Badge variant="secondary" className="text-[10px] sm:text-sm lg:text-base px-2 py-0.5 whitespace-nowrap">{topThree[1].score.toLocaleString()}</Badge>
                                                </div>
                                            </div>
                                        )}

                                        {/* 1st Place */}
                                        {topThree[0] && (
                                            <div className="flex flex-col items-center w-1/3 z-20 animate-in slide-in-from-bottom duration-1000 h-[85%] max-h-full min-w-0">
                                                <div className="relative mb-3 md:mb-6 flex-shrink-0 transform scale-75 md:scale-100 origin-bottom">
                                                    <Trophy className="w-8 h-8 sm:w-12 sm:h-12 lg:w-16 lg:h-16 text-yellow-300 absolute -top-10 sm:-top-16 lg:-top-20 left-1/2 -translate-x-1/2 animate-bounce drop-shadow-[0_0_20px_rgba(250,204,21,1)]" />
                                                    <div className="w-20 h-20 sm:w-24 sm:h-24 lg:w-32 lg:h-32 rounded-full bg-gradient-to-br from-yellow-300 to-yellow-600 border-4 md:border-8 border-white shadow-[0_0_60px_rgba(250,204,21,0.6)] flex items-center justify-center z-10 relative">
                                                        <span className="text-4xl sm:text-5xl lg:text-6xl">👑</span>
                                                    </div>
                                                </div>
                                                <div className="flex-1 w-full bg-gradient-to-t from-yellow-900/80 via-yellow-700/80 to-yellow-600/80 rounded-t-2xl md:rounded-t-3xl backdrop-blur-md border-t border-white/30 flex flex-col items-center pt-4 md:pt-6 shadow-[0_0_50px_rgba(234,179,8,0.3)] min-w-0">
                                                    <p className="font-black text-base sm:text-2xl lg:text-4xl text-white mb-1 md:mb-2 text-shadow-sm px-2 text-center truncate w-full">{topThree[0].nickname}</p>
                                                    <Badge className="text-xs sm:text-lg lg:text-xl px-3 py-1 bg-black/40 border-none">{topThree[0].score.toLocaleString()}</Badge>
                                                </div>
                                            </div>
                                        )}

                                        {/* 3rd Place */}
                                        {topThree[2] && (
                                            <div className="flex flex-col items-center w-1/3 animate-in slide-in-from-bottom duration-1000 delay-500 h-[55%] max-h-full min-w-0">
                                                <div className="relative mb-2 md:mb-4 flex-shrink-0 transform scale-75 md:scale-100 origin-bottom">
                                                    <div className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 rounded-full bg-orange-700 border-2 md:border-4 border-white shadow-[0_0_20px_rgba(194,65,12,0.4)] flex items-center justify-center z-10 relative">
                                                        <span className="text-3xl sm:text-4xl">🥉</span>
                                                    </div>
                                                </div>
                                                <div className="flex-1 w-full bg-gradient-to-t from-orange-950/80 to-orange-800/80 rounded-t-xl md:rounded-t-2xl backdrop-blur-md border-t border-white/20 flex flex-col items-center pt-3 md:pt-4 shadow-2xl min-w-0">
                                                    <p className="font-bold text-sm sm:text-lg lg:text-2xl text-white mb-1 px-2 text-center truncate w-full">{topThree[2].nickname}</p>
                                                    <Badge variant="secondary" className="text-[10px] sm:text-sm lg:text-base px-2 py-0.5 whitespace-nowrap">{topThree[2].score.toLocaleString()}</Badge>
                                                </div>
                                            </div>
                                        )}
                                    </>
                                );
                            })()}
                        </div>
                    </div>

                    <div className="flex-shrink-0 w-full max-w-sm flex justify-center z-20 mb-6 lg:mb-10">
                        <Link href="/quizzes" className="w-full">
                            <Button size="lg" className="h-14 md:h-16 px-8 md:px-12 w-full text-lg md:text-xl font-black bg-white text-black hover:bg-gray-100 shadow-[0_10px_40px_rgba(255,255,255,0.2)] rounded-2xl btn-juicy">
                                BACK TO MENU
                            </Button>
                        </Link>
                    </div>
                </div>
            )}
        </div>
    );
}
