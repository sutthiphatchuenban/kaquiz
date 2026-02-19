"use client";

import { useState, useEffect, use, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useGameStore } from "@/stores/game-store";
import { useSocket } from "@/hooks/use-socket";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    Sparkles,
    Loader2,
    Users,
    Check,
    X,
    Trophy,
    Clock
} from "lucide-react";
import { toast } from "sonner";

const getColorClass = (color: string) => {
    const colors: Record<string, string> = {
        red: "bg-[var(--answer-red)] hover:bg-[var(--answer-red)]/90",
        blue: "bg-[var(--answer-blue)] hover:bg-[var(--answer-blue)]/90",
        green: "bg-[var(--answer-green)] hover:bg-[var(--answer-green)]/90",
        yellow: "bg-[var(--answer-yellow)] hover:bg-[var(--answer-yellow)]/90",
    };
    return colors[color] || colors.red;
};

interface Answer {
    id: string;
    answerText: string;
    color: string;
    order: number;
}

interface Question {
    id: string;
    questionText: string;
    type: string;
    timeLimit: number;
    points: number;
    answers: Answer[];
}

interface GameData {
    id: string;
    pin: string;
    status: string;
    currentQuestionIndex: number;
    quiz: {
        title: string;
        questions: Question[];
    };
    players: { id: string; nickname: string; score: number }[];
}

export default function PlayPage({ params }: { params: Promise<{ pin: string }> }) {
    const { pin } = use(params);
    const router = useRouter();
    const {
        playerId,
        playerNickname,
        hasAnswered,
        lastAnswerCorrect,
        lastPointsEarned,
        setPlayer,
        setHasAnswered,
        setAnswerResult,
        resetGame,
    } = useGameStore();
    const {
        isConnected,
        joinGame: socketJoinGame,
        submitAnswer: socketSubmitAnswer,
        onGameStarted,
        onQuestion,
        onShowAnswer,
        onLeaderboard,
        onGameEnded,
    } = useSocket();

    const [nickname, setNickname] = useState("");
    const [isJoining, setIsJoining] = useState(false);
    const [gameData, setGameData] = useState<GameData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
    const [answerStartTime, setAnswerStartTime] = useState<number>(0);
    const [timeRemaining, setTimeRemaining] = useState(0);
    const [myScore, setMyScore] = useState(0);
    const [myRank, setMyRank] = useState(0);

    // Validate PIN and fetch game
    useEffect(() => {
        if (pin.length !== 6 || !/^\d+$/.test(pin)) {
            toast.error("Game PIN ไม่ถูกต้อง");
            router.push("/join");
            return;
        }
        fetchGame();

        return () => {
            resetGame();
        };
    }, [pin]);

    // Re-join room if socket reconnects
    useEffect(() => {
        if (isConnected && pin && playerId && playerNickname) {
            socketJoinGame(pin, playerId, playerNickname);
            fetchGame();
        }
    }, [isConnected, pin, playerId, playerNickname, socketJoinGame]);

    // Socket event listeners for real-time updates
    useEffect(() => {
        const unsubStarted = onGameStarted(() => {
            fetchGame();
        });

        const unsubQuestion = onQuestion(({ questionIndex }) => {
            fetchGame();
        });

        const unsubShowAnswer = onShowAnswer(() => {
            fetchGame();
        });

        const unsubLeaderboard = onLeaderboard(() => {
            fetchGame();
        });

        const unsubEnded = onGameEnded(() => {
            fetchGame();
        });

        return () => {
            unsubStarted();
            unsubQuestion();
            unsubShowAnswer();
            unsubLeaderboard();
            unsubEnded();
        };
    }, [onGameStarted, onQuestion, onShowAnswer, onLeaderboard, onGameEnded]);

    // Poll for game updates (fallback if socket not connected)
    useEffect(() => {
        let pollInterval: NodeJS.Timeout;

        if (playerId && !isConnected) {
            pollInterval = setInterval(async () => {
                await fetchGame();
            }, 1000);
        }

        return () => {
            if (pollInterval) clearInterval(pollInterval);
        };
    }, [playerId, isConnected]);

    // Timer effect
    useEffect(() => {
        let timer: NodeJS.Timeout;

        if (gameData?.status === "QUESTION" && timeRemaining > 0 && !hasAnswered) {
            timer = setInterval(() => {
                setTimeRemaining((prev) => Math.max(0, prev - 1));
            }, 1000);
        }

        return () => {
            if (timer) clearInterval(timer);
        };
    }, [gameData?.status, timeRemaining, hasAnswered]);

    // Reset state when question changes
    useEffect(() => {
        if (gameData?.status === "QUESTION") {
            const currentQuestion = gameData.quiz.questions[gameData.currentQuestionIndex];
            if (currentQuestion) {
                setTimeRemaining(currentQuestion.timeLimit);
                setAnswerStartTime(Date.now());
                setSelectedAnswer(null);
                setHasAnswered(false);
                setAnswerResult(null as any, 0);
            }
        }
    }, [gameData?.status, gameData?.currentQuestionIndex]);

    // Update my score and rank
    useEffect(() => {
        if (gameData && playerId) {
            const me = gameData.players.find(p => p.id === playerId);
            if (me) {
                setMyScore(me.score);
                const sortedPlayers = [...gameData.players].sort((a, b) => b.score - a.score);
                const rank = sortedPlayers.findIndex(p => p.id === playerId) + 1;
                setMyRank(rank);
            }
        }
    }, [gameData, playerId]);

    const fetchGame = async () => {
        try {
            const res = await fetch(`/api/games/${pin}`);
            const data = await res.json();

            if (data.success) {
                setGameData(data.data);
            } else {
                toast.error("ไม่พบเกมนี้");
                router.push("/join");
            }
        } catch {
            // Silent fail for polling
        } finally {
            setIsLoading(false);
        }
    };

    const handleJoin = async () => {
        if (!nickname.trim()) {
            toast.error("กรุณากรอกชื่อเล่น");
            return;
        }

        if (nickname.length > 20) {
            toast.error("ชื่อเล่นต้องไม่เกิน 20 ตัวอักษร");
            return;
        }

        setIsJoining(true);

        try {
            const res = await fetch(`/api/games/${pin}/join`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ nickname }),
            });

            const data = await res.json();

            if (data.success) {
                setPlayer(data.data.id, nickname);
                // Emit socket event to notify host
                socketJoinGame(pin, data.data.id, nickname);
                toast.success(`ยินดีต้อนรับ ${nickname}!`);
                await fetchGame();
            } else {
                toast.error(data.error || "เข้าร่วมเกมไม่สำเร็จ");
            }
        } catch {
            toast.error("เกิดข้อผิดพลาด");
        } finally {
            setIsJoining(false);
        }
    };

    const handleSelectAnswer = async (answerId: string) => {
        if (hasAnswered || !playerId || !gameData) return;

        setSelectedAnswer(answerId);
        setHasAnswered(true);

        const responseTime = Date.now() - answerStartTime;
        const currentQuestion = gameData.quiz.questions[gameData.currentQuestionIndex];

        try {
            const res = await fetch(`/api/games/${pin}/answer`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    playerId,
                    questionId: currentQuestion.id,
                    answerId,
                    responseTime,
                }),
            });

            const data = await res.json();

            if (data.success) {
                // Emit socket event to notify host
                socketSubmitAnswer(pin, playerId);
                setAnswerResult(data.data.isCorrect, data.data.pointsEarned);
                if (data.data.isCorrect) {
                    setMyScore((prev) => prev + data.data.pointsEarned);
                }
            }
        } catch {
            toast.error("ส่งคำตอบไม่สำเร็จ");
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen game-bg flex items-center justify-center">
                <Loader2 className="w-12 h-12 animate-spin text-white" />
            </div>
        );
    }

    if (!gameData) {
        return null;
    }

    // Not joined yet - show nickname input
    if (!playerId) {
        if (gameData.status !== "LOBBY") {
            return (
                <div className="min-h-screen game-bg flex items-center justify-center p-4 text-white text-center">
                    <div>
                        <h1 className="text-3xl font-bold mb-4">เกมเริ่มแล้ว</h1>
                        <p className="text-white/70 mb-6">ไม่สามารถเข้าร่วมได้ในขณะนี้</p>
                        <Button onClick={() => router.push("/join")} variant="outline" className="border-white/30 text-white hover:bg-white/10">
                            กลับหน้าหลัก
                        </Button>
                    </div>
                </div>
            );
        }

        return (
            <div className="min-h-screen game-bg flex items-center justify-center p-4">
                <Card className="w-full max-w-md border-none shadow-2xl">
                    <CardHeader className="text-center pb-4">
                        <div className="mx-auto w-16 h-16 rounded-2xl mb-4 flex items-center justify-center">
                            <img src="/favicon.ico" alt="KaQuiz" className="w-16 h-16 rounded-2xl object-contain" />
                        </div>
                        <CardTitle className="text-2xl">เข้าร่วม: {gameData.quiz.title}</CardTitle>
                        <CardDescription>
                            Game PIN: <span className="font-mono font-bold text-lg text-foreground">{pin}</span>
                        </CardDescription>
                    </CardHeader>
                    <div className="px-6 pb-6 space-y-4">
                        <div className="space-y-2">
                            <Input
                                type="text"
                                placeholder="ใส่ชื่อเล่นของคุณ"
                                value={nickname}
                                onChange={(e) => setNickname(e.target.value)}
                                className="h-14 text-center text-xl"
                                maxLength={20}
                                disabled={isJoining}
                                onKeyDown={(e) => e.key === "Enter" && handleJoin()}
                            />
                            <p className="text-xs text-muted-foreground text-right">{nickname.length}/20</p>
                        </div>
                        <Button
                            onClick={handleJoin}
                            className="w-full h-14 text-lg font-semibold"
                            disabled={isJoining || !nickname.trim()}
                        >
                            {isJoining ? (
                                <>
                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                    กำลังเข้าร่วม...
                                </>
                            ) : (
                                "เข้าร่วมเกม"
                            )}
                        </Button>
                    </div>
                </Card>
            </div>
        );
    }

    // LOBBY - Waiting for game to start
    if (gameData.status === "LOBBY") {
        return (
            <div className="min-h-screen game-bg flex flex-col items-center justify-center p-4 text-white">
                <div className="text-center space-y-6">
                    <div className="w-24 h-24 rounded-full bg-white/10 backdrop-blur flex items-center justify-center mx-auto pulse-kahoot">
                        <Users className="w-12 h-12" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold mb-2">รอเริ่มเกม...</h1>
                        <p className="text-white/70">เมื่อ Host เริ่มเกม คุณจะเห็นคำถามบนหน้าจอ</p>
                    </div>
                    <div className="bg-white/10 backdrop-blur rounded-2xl px-8 py-4">
                        <p className="text-sm text-white/70 mb-1">คุณเข้าร่วมในชื่อ</p>
                        <p className="text-2xl font-bold">{playerNickname}</p>
                    </div>
                    <p className="text-white/50">
                        {gameData.players.length} ผู้เล่นในห้อง
                    </p>
                </div>
            </div>
        );
    }

    const currentQuestion = gameData.quiz.questions[gameData.currentQuestionIndex];

    // QUESTION - Answering time
    if (gameData.status === "QUESTION" && currentQuestion) {
        if (hasAnswered) {
            return (
                <div className="min-h-screen game-bg flex flex-col items-center justify-center p-4 text-white">
                    <div className="text-center space-y-6">
                        <div className={`w-32 h-32 rounded-full flex items-center justify-center mx-auto ${lastAnswerCorrect === null ? "bg-white/10" : lastAnswerCorrect ? "bg-green-500" : "bg-red-500"
                            }`}>
                            {lastAnswerCorrect === null ? (
                                <Clock className="w-16 h-16" />
                            ) : lastAnswerCorrect ? (
                                <Check className="w-16 h-16" />
                            ) : (
                                <X className="w-16 h-16" />
                            )}
                        </div>
                        <div>
                            {lastAnswerCorrect === null ? (
                                <h2 className="text-2xl font-bold">รอผลลัพธ์...</h2>
                            ) : lastAnswerCorrect ? (
                                <>
                                    <h2 className="text-3xl font-bold text-green-300 celebrate">ถูกต้อง!</h2>
                                    <p className="text-xl mt-2">+{lastPointsEarned.toLocaleString()} คะแนน</p>
                                </>
                            ) : (
                                <h2 className="text-3xl font-bold text-red-300">ผิด!</h2>
                            )}
                        </div>
                    </div>
                </div>
            );
        }

        return (
            <div className="min-h-screen game-bg flex flex-col p-4">
                {/* Timer */}
                <div className="text-center mb-4">
                    <div className="w-20 h-20 countdown-circle text-3xl mx-auto">
                        {timeRemaining}
                    </div>
                </div>

                {/* Answers */}
                <div className="flex-1 grid grid-cols-2 gap-4 max-w-2xl mx-auto w-full">
                    {currentQuestion.answers.map((answer) => (
                        <button
                            key={answer.id}
                            onClick={() => handleSelectAnswer(answer.id)}
                            disabled={hasAnswered || timeRemaining === 0}
                            className={`answer-btn ${getColorClass(answer.color)} ${selectedAnswer === answer.id ? "ring-4 ring-white scale-95" : ""
                                } ${hasAnswered || timeRemaining === 0 ? "opacity-50 cursor-not-allowed" : ""}`}
                        >
                            {answer.answerText}
                        </button>
                    ))}
                </div>
            </div>
        );
    }

    // SHOWING_ANSWER or LEADERBOARD - Waiting
    if (gameData.status === "SHOWING_ANSWER" || gameData.status === "LEADERBOARD") {
        return (
            <div className="min-h-screen game-bg flex flex-col items-center justify-center p-4 text-white">
                <div className="text-center space-y-6">
                    <Trophy className="w-16 h-16 mx-auto text-yellow-400" />
                    <h2 className="text-2xl font-bold">ดูหน้าจอหลัก!</h2>
                    <div className="bg-white/10 backdrop-blur rounded-2xl px-8 py-6">
                        <p className="text-sm text-white/70 mb-1">คะแนนของคุณ</p>
                        <p className="text-4xl font-bold">{myScore.toLocaleString()}</p>
                        <p className="text-white/70 mt-2">อันดับที่ {myRank}</p>
                    </div>
                </div>
            </div>
        );
    }

    // FINISHED
    if (gameData.status === "FINISHED") {
        return (
            <div className="min-h-screen game-bg flex flex-col items-center justify-center p-4 text-white">
                <div className="text-center space-y-6">
                    <h1 className="text-4xl font-bold">🎉 จบเกม!</h1>
                    <div className="bg-white/10 backdrop-blur rounded-2xl px-8 py-6">
                        <p className="text-sm text-white/70 mb-1">คะแนนสุดท้ายของคุณ</p>
                        <p className="text-5xl font-bold text-yellow-300">{myScore.toLocaleString()}</p>
                        <p className="text-xl text-white/70 mt-2">อันดับที่ {myRank} จาก {gameData.players.length} คน</p>
                    </div>
                    <Button
                        onClick={() => router.push("/join")}
                        className="bg-white text-primary hover:bg-white/90"
                    >
                        เล่นเกมใหม่
                    </Button>
                </div>
            </div>
        );
    }

    return null;
}
