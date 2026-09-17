"use client";

/* Polling effects intentionally depend on stable game identifiers/status only. */
/* eslint-disable react-hooks/exhaustive-deps */

import { useState, useEffect, use, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/stores/auth-store";
import { useSocket } from "@/hooks/use-socket";
import { Progress } from "@/components/ui/progress";
import { ArcadeSprite } from "@/components/arcade-sprite";
import {
    ArrowLeft,
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
        red: "kq-answer-red",
        blue: "kq-answer-blue",
        green: "kq-answer-green",
        yellow: "kq-answer-yellow",
    };
    return colors[color] || colors.red;
};

// Light tints used by the lobby player wall
const PLAYER_TINTS = [
    "var(--sunny)",
    "var(--electric)",
    "var(--mint)",
    "var(--peach)",
];

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
    id: string;
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
    startedAt: string | null;
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
        onPlayerLeft,
        onAnswerReceived,
    } = useSocket();

    const [gameData, setGameData] = useState<GameData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isUpdating, setIsUpdating] = useState(false);
    const isUpdatingRef = useRef(false); // ref version to avoid stale closure
    const lastUpdateRef = useRef<number>(Date.now());
    const [timeRemaining, setTimeRemaining] = useState(0);
    const [answeredCount, setAnsweredCount] = useState(0);
    const [isMuted, setIsMuted] = useState(false);
    const [isMusicOn, setIsMusicOn] = useState(true);
    const [isQrOpen, setIsQrOpen] = useState(false);

    useEffect(() => {
        if (!isQrOpen) return;

        const closeOnEscape = (event: KeyboardEvent) => {
            if (event.key === "Escape") setIsQrOpen(false);
        };
        document.addEventListener("keydown", closeOnEscape);
        return () => document.removeEventListener("keydown", closeOnEscape);
    }, [isQrOpen]);

    // Sound Management
    const playSound = useCallback((type: "lobby" | "countdown" | "question" | "reveal" | "win" | "join") => {
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

    const toggleMusic = () => {
        const next = !isMusicOn;
        setIsMusicOn(next);
        if (!next) {
            audioSynth.stopBGM();
        } else if (gameData?.status === "LOBBY") {
            playSound("lobby");
        } else if (gameData?.status === "QUESTION") {
            playSound("question");
        }
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

    // ── Socket real-time events ──────────────────────────────────────────
    useEffect(() => {
        // Player joined → add to list immediately (no fetchGame needed)
        const unsubPlayerJoined = onPlayerJoined(({ playerId, nickname }) => {
            playSound("join");
            toast.success(`${nickname} เข้าร่วมแล้ว!`);
            setGameData((prev) => {
                if (!prev) return prev;
                // Avoid duplicates
                if (prev.players.some((p) => p.id === playerId)) return prev;
                return {
                    ...prev,
                    players: [...prev.players, { id: playerId, nickname, score: 0 }],
                };
            });
        });

        // Player left → remove from list immediately
        const unsubPlayerLeft = onPlayerLeft(({ playerId }: { playerId: string }) => {
            setGameData((prev) => {
                if (!prev) return prev;
                return {
                    ...prev,
                    players: prev.players.filter((p) => p.id !== playerId),
                };
            });
        });

        // Answer received → increment counter
        const unsubAnswerReceived = onAnswerReceived(() => {
            setAnsweredCount((prev) => prev + 1);
        });

        return () => {
            unsubPlayerJoined();
            unsubPlayerLeft();
            unsubAnswerReceived();
        };
    }, [onPlayerJoined, onPlayerLeft, onAnswerReceived, playSound]);

    // Initial fetch once on mount
    useEffect(() => {
        if (isAuthenticated && pin) {
            fetchGame();
        }
    }, [isAuthenticated, pin]);

    // ── Timer (synced with server startedAt) ─────────────────────────────
    const handleShowAnswerTimerRef = useRef<() => void>(() => { });
    useEffect(() => {
        handleShowAnswerTimerRef.current = () => {
            if (!isUpdatingRef.current) {
                handleShowAnswer();
            }
        };
    });

    // Compute timeRemaining from server startedAt for accuracy
    const computedTimeRemaining = useCallback(() => {
        if (gameData?.status !== "QUESTION" || !gameData?.startedAt) return 0;
        const currentQuestion = gameData.quiz.questions[gameData.currentQuestionIndex];
        if (!currentQuestion) return 0;
        const elapsed = Math.floor((Date.now() - new Date(gameData.startedAt).getTime()) / 1000);
        return Math.max(0, currentQuestion.timeLimit - elapsed);
    }, [gameData?.status, gameData?.startedAt, gameData?.currentQuestionIndex, gameData?.quiz?.questions]);

    // Keep local timeRemaining in sync for display
    useEffect(() => {
        if (gameData?.status !== "QUESTION") return;
        setTimeRemaining(computedTimeRemaining());
    }, [gameData?.status, gameData?.startedAt, gameData?.currentQuestionIndex, computedTimeRemaining]);

    // Tick every second to update the countdown display
    useEffect(() => {
        if (gameData?.status !== "QUESTION") return;
        const tick = setInterval(() => {
            setTimerTick((t) => t + 1);
            const remaining = computedTimeRemaining();
            setTimeRemaining(remaining);
            if (remaining <= 5 && remaining > 0) audioSynth.playCountdown();
            if (remaining <= 0) {
                handleShowAnswerTimerRef.current();
            }
        }, 1000);
        return () => clearInterval(tick);
    }, [gameData?.status, gameData?.startedAt, gameData?.currentQuestionIndex, computedTimeRemaining]);

    const [isAutoPlay, setIsAutoPlay] = useState(true);
    const [joinUrl, setJoinUrl] = useState("");
    const [, setTimerTick] = useState(0);

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

    // Poll aggressively (No WebSocket needed)
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (gameData?.status === "LOBBY" || gameData?.status === "QUESTION") {
            interval = setInterval(() => {
                fetchGame();
            }, 1000); // 1 second fast polling
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [gameData?.status, pin]);


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
        const fetchTime = Date.now();
        try {
            const res = await fetch(`/api/games/${pin}/host`);
            const data = await res.json();

            if (data.success) {
                if (isUpdatingRef.current) return;
                // Ignore if a manual update happened AFTER this fetch started
                if (lastUpdateRef.current > fetchTime) return;

                setGameData(data.data);
            
                // --- ADDED FOR POLLING (Without WebSockets) ---
                if (data.data.status === "QUESTION") {
                    const currentQ = data.data.quiz.questions[data.data.currentQuestionIndex];
                    if (currentQ?.playerAnswers) {
                        // Only count answers from players currently in THIS session
                        // (playerAnswers includes answers from ALL past sessions using this question)
                        const currentPlayerIds = new Set(data.data.players.map((p: Player) => p.id));
                        const sessionAnswers = currentQ.playerAnswers.filter(
                            (pa: { playerId: string }) => currentPlayerIds.has(pa.playerId)
                        );
                        setAnsweredCount(sessionAnswers.length);
                    }
                }
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
        if (isUpdatingRef.current) return false;
        isUpdatingRef.current = true;
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
                lastUpdateRef.current = Date.now();
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
            isUpdatingRef.current = false;
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
        if (isUpdatingRef.current) return;
        const success = await updateGameStatus("SHOWING_ANSWER");
        if (success) {
            socketShowAnswer(pin);
        }
    }, [pin, socketShowAnswer]);

    // Auto Skip if all answered (placed here so handleShowAnswer is already declared)
    useEffect(() => {
        if (gameData?.status !== "QUESTION") return;
        if (!gameData?.players?.length) return;
        if (answeredCount < gameData.players.length) return;

        const timer = setTimeout(() => {
            handleShowAnswer();
        }, 1000);
        return () => clearTimeout(timer);
    }, [gameData?.status, answeredCount, gameData?.players?.length, handleShowAnswer]);

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

    const handleEndGame = async () => {
        const success = await updateGameStatus("FINISHED");
        if (success) {
            socketEndGame(pin);
        }
    };

    if (authLoading || isLoading) {
        return (
            <div className="kq-game-bg grid min-h-dvh place-items-center">
                <div className="grid place-items-center gap-5 text-center">
                    <Loader2 className="size-16 animate-spin text-[var(--sunny)]" />
                    <p className="kq-pixel text-[var(--sunny)]">LOADING...</p>
                    <p className="text-sm font-semibold text-[#f2e6ff]">กำลังโหลดห้องเกม...</p>
                </div>
            </div>
        );
    }

    if (!gameData) return null;

    const currentQuestion = gameData.quiz.questions[gameData.currentQuestionIndex];
    const answerLetters = ["A", "B", "C", "D"];
    const answerGlyphs = ["▲", "◆", "●", "■"];

    return (
        <div className="kq-game-bg text-[var(--on-arcade)]">
            {/* Faint arcade floor grid */}
            <div
                aria-hidden
                className="pointer-events-none absolute inset-0 opacity-[0.12]"
                style={{
                    backgroundImage:
                        "linear-gradient(rgba(255,255,255,.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.6) 1px, transparent 1px)",
                    backgroundSize: "52px 52px",
                }}
            />

            {isQrOpen && joinUrl ? (
                <div
                    role="dialog"
                    aria-modal="true"
                    aria-label="QR Code สำหรับเข้าร่วมเกม"
                    className="fixed inset-0 z-[100] grid place-items-center bg-[#12082e]/90 p-4 backdrop-blur-sm"
                    onClick={() => setIsQrOpen(false)}
                >
                    <div
                        className="relative max-h-full max-w-full border-4 border-line bg-[var(--paper)] p-5 text-center shadow-hard-xl sm:p-8"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <button
                            type="button"
                            onClick={() => setIsQrOpen(false)}
                            aria-label="ปิด QR Code"
                            className="kq-btn kq-btn-sm kq-btn-yellow absolute -right-3 -top-3 z-10 !px-3"
                        >
                            <X className="size-5" />
                        </button>
                        <p className="kq-pixel mb-4 text-[10px] text-[#211543]">SCAN TO JOIN</p>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=900x900&data=${encodeURIComponent(joinUrl)}`}
                            alt="QR Code ขนาดใหญ่สำหรับเข้าร่วมเกม"
                            className="mx-auto h-auto w-[min(78vw,68vh)] max-w-[720px] bg-white"
                        />
                        <p className="mt-4 break-all text-sm font-bold text-[#211543] sm:text-base">
                            {joinUrl}
                        </p>
                        <p className="mt-2 text-sm font-semibold text-[#564765]">
                            คลิกด้านนอกหรือกด ESC เพื่อปิด
                        </p>
                    </div>
                </div>
            ) : null}

            {/* ── Audio controls — kept in normal flow to avoid covering game UI ── */}
            <div className="kq-shell-wide relative z-20 flex justify-end pt-4">
                <div className="flex items-center gap-2 border-[3px] border-line bg-[var(--paper)] p-2 shadow-hard">
                    <span className="kq-pixel hidden px-1 text-[8px] text-[#211543] sm:block">
                        AUDIO
                    </span>
                    <button
                    type="button"
                    onClick={() => setIsAutoPlay(!isAutoPlay)}
                    aria-label={isAutoPlay ? "ปิดโหมดเล่นอัตโนมัติ" : "เปิดโหมดเล่นอัตโนมัติ"}
                    aria-pressed={isAutoPlay}
                    title={isAutoPlay ? "Auto Play ON" : "Auto Play OFF"}
                    className={`kq-btn kq-btn-sm ${isAutoPlay ? "kq-btn-mint" : "kq-btn-paper"}`}
                >
                    <Play className="size-4" />
                </button>
                <button
                    type="button"
                    onClick={toggleMute}
                    aria-label={isMuted ? "เปิดเสียง" : "ปิดเสียง"}
                    aria-pressed={isMuted}
                    title={isMuted ? "เปิดเสียง" : "ปิดเสียง"}
                    className="kq-btn kq-btn-sm kq-btn-paper"
                >
                    {isMuted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
                </button>
                    <button
                        type="button"
                        onClick={toggleMusic}
                        aria-label={isMusicOn ? "ปิดเพลงประกอบ" : "เปิดเพลงประกอบ"}
                        aria-pressed={isMusicOn}
                        title={isMusicOn ? "ปิดเพลงประกอบ" : "เปิดเพลงประกอบ"}
                        className={`kq-btn kq-btn-sm ${isMusicOn ? "kq-btn-cyan" : "kq-btn-paper"}`}
                    >
                        <Music className="size-4" />
                    </button>
                </div>
            </div>

            {/* ════════════════════ LOBBY ════════════════════ */}
            {gameData.status === "LOBBY" && (
                <div className="relative z-10 flex min-h-dvh flex-col">
                    <header className="kq-shell-wide flex flex-wrap items-center justify-between gap-4 pt-6">
                        <div className="flex min-w-0 items-center gap-3">
                            <span className="kq-brand-mark">
                                <ArcadeSprite kind="bot" className="size-7" />
                            </span>
                            <div className="min-w-0">
                                <p className="kq-overline text-[var(--electric)]">
                                    KAQUIZ • LIVE ROOM
                                </p>
                                <h1 className="truncate text-[clamp(1.3rem,2.6vw,2.1rem)] font-extrabold text-[var(--on-arcade)]">
                                    {gameData.quiz.title}
                                </h1>
                            </div>
                        </div>
                        <span className="kq-badge kq-badge-cyan text-[10px]">LOBBY</span>
                    </header>

                    <div className="kq-shell-wide grid flex-1 content-start gap-6 py-6 lg:grid-cols-2">
                        {/* ── PIN hero + join instructions ── */}
                        <div className="flex flex-col gap-6">
                            <section className="relative border-4 border-line bg-[var(--arcade-deep)] px-6 py-9 text-center shadow-hard-xl">
                                <span className="kq-sticker absolute -top-5 right-6 z-10 rotate-[8deg] px-3 py-2">
                                    JOIN NOW!
                                </span>
                                <p className="kq-pixel text-[10px] text-[var(--electric)]">
                                    GAME PIN
                                </p>
                                <p className="kq-pin mt-2 text-[clamp(3rem,10vw,6.5rem)]">{pin}</p>
                                <p className="mt-4 text-sm font-semibold leading-relaxed text-[#f2e6ff] sm:text-base">
                                    เปิด KaQuiz บนมือถือ แล้วกรอกรหัสนี้เพื่อเข้าเล่น
                                </p>
                            </section>

                            <section className="kq-card p-5 sm:p-6">
                                <div className="flex items-center gap-3">
                                    <span className="grid size-11 flex-none place-items-center border-[3px] border-line bg-[var(--electric)] text-[#211543] shadow-hard-sm">
                                        <Users className="size-5" strokeWidth={2.5} />
                                    </span>
                                    <div>
                                        <h2 className="text-lg font-bold text-ink">วิธีเข้าร่วม</h2>
                                        <p className="kq-pixel mt-0.5 text-[7px] text-muted-foreground">
                                            HOW TO JOIN
                                        </p>
                                    </div>
                                </div>

                                <ol className="mt-5 grid gap-3">
                                    {[
                                        { n: "01", text: "เปิดเว็บ KaQuiz บนมือถือ" },
                                        { n: "02", text: "กรอก Game PIN 6 หลักที่เห็นบนจอ" },
                                        { n: "03", text: "ตั้งชื่อเล่น แล้วรอสัญญาณเริ่มเกม" },
                                    ].map((step) => (
                                        <li key={step.n} className="flex items-center gap-3">
                                            <span className="grid size-9 flex-none place-items-center border-[3px] border-line bg-[var(--sunny)] shadow-hard-sm">
                                                <span className="kq-pixel text-[8px] text-[#211543]">
                                                    {step.n}
                                                </span>
                                            </span>
                                            <span className="text-sm font-bold text-ink">
                                                {step.text}
                                            </span>
                                        </li>
                                    ))}
                                </ol>

                                {joinUrl ? (
                                    <div className="mt-5 flex items-center gap-4 border-[3px] border-line bg-[var(--cream)] p-3">
                                        <button
                                            type="button"
                                            onClick={() => setIsQrOpen(true)}
                                            aria-label="เปิด QR Code เต็มหน้าจอ"
                                            title="คลิกเพื่อขยาย QR Code"
                                            className="group flex-none cursor-zoom-in border-[3px] border-line bg-[var(--paper)] p-1 transition-transform hover:-translate-y-1 focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[var(--electric)]"
                                        >
                                            {/* External QR endpoint cannot use Next Image without a fixed remote pattern. */}
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img
                                                src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(joinUrl)}`}
                                                alt="QR Code สำหรับเข้าร่วมเกม"
                                                className="size-24 bg-white lg:size-32"
                                            />
                                        </button>
                                        <div className="min-w-0">
                                            <p className="kq-pixel text-[8px] text-[#211543]">
                                                SCAN ME
                                            </p>
                                            <p className="mt-1 break-all text-xs font-bold text-[#564765]">
                                                {joinUrl}
                                            </p>
                                            <p className="mt-1 text-xs font-semibold text-muted-foreground">
                                                สแกนด้วยกล้องมือถือเพื่อเข้าห้องทันที
                                            </p>
                                        </div>
                                    </div>
                                ) : null}
                            </section>
                        </div>

                        {/* ── Live player wall ── */}
                        <section className="kq-card flex min-h-[26rem] flex-col">
                            <div className="flex items-center justify-between gap-3 p-5 pb-4">
                                <div className="flex items-center gap-3">
                                    <span className="grid size-11 flex-none place-items-center border-[3px] border-line bg-[var(--candy)] text-[#211543] shadow-hard-sm">
                                        <Users className="size-5" strokeWidth={2.5} />
                                    </span>
                                    <div>
                                        <h2 className="text-lg font-bold text-ink">ผู้เล่นในห้อง</h2>
                                        <p className="kq-pixel mt-0.5 text-[7px] text-muted-foreground">
                                            PLAYERS JOINED
                                        </p>
                                    </div>
                                </div>
                                <span className="kq-badge kq-badge-pink text-[10px]">
                                    {gameData.players.length} คน
                                </span>
                            </div>

                            <hr className="kq-divider mx-5" />

                            <div className="kq-scroll min-h-0 flex-1 p-5">
                                {gameData.players.length > 0 ? (
                                    <div className="flex flex-wrap content-start gap-2.5">
                                        {gameData.players.map((player, i) => (
                                            <span
                                                key={player.id}
                                                className="kq-chip pointer-events-none animate-bounce-in cursor-default text-base"
                                                style={{
                                                    backgroundColor:
                                                        PLAYER_TINTS[i % PLAYER_TINTS.length],
                                                }}
                                            >
                                                <span className="size-2.5 flex-none rounded-full bg-[#211543]" />
                                                {player.nickname}
                                            </span>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="grid h-full place-items-center gap-4 text-center">
                                        <ArcadeSprite kind="bot" className="size-28 animate-float" />
                                        <div>
                                            <p className="text-lg font-bold text-ink">
                                                รอผู้เล่นเข้าร่วม...
                                            </p>
                                            <p className="mt-1 text-sm font-semibold text-muted-foreground">
                                                แชร์ PIN {pin} ให้ทุกคนในห้องเลย
                                            </p>
                                        </div>
                                        <Loader2 className="size-6 animate-spin text-[var(--candy)]" />
                                    </div>
                                )}
                            </div>
                        </section>
                    </div>

                    <footer className="kq-shell-wide flex flex-wrap items-center justify-between gap-4 pb-8">
                        <div className="kq-stat">
                            <span className="kq-stat-icon">
                                <Users className="size-5" strokeWidth={2.5} />
                            </span>
                            <span>
                                <span className="kq-stat-value block text-2xl">
                                    {gameData.players.length}
                                </span>
                                <span className="kq-stat-label block">ผู้เล่นพร้อมแล้ว</span>
                            </span>
                        </div>

                        <button
                            type="button"
                            onClick={handleStartGame}
                            disabled={gameData.players.length === 0 || isUpdating}
                            className="kq-btn kq-btn-yellow kq-btn-lg"
                        >
                            {isUpdating ? (
                                <Loader2 className="size-5 animate-spin" />
                            ) : (
                                <Play className="size-5" />
                            )}
                            เริ่มเกม
                        </button>
                    </footer>
                </div>
            )}

            {/* ════════════════════ QUESTION ════════════════════ */}
            {gameData.status === "QUESTION" && currentQuestion && (
                <div className="relative z-10 flex min-h-dvh flex-col">
                    <header className="kq-shell-wide flex flex-wrap items-center justify-between gap-4 pt-6">
                        <div className="min-w-0">
                            <p className="kq-overline text-[var(--electric)]">
                                QUESTION {gameData.currentQuestionIndex + 1} /{" "}
                                {gameData.quiz.questions.length}
                            </p>
                            <h1 className="truncate text-[clamp(1.2rem,2.4vw,1.9rem)] font-extrabold text-[var(--on-arcade)]">
                                {gameData.quiz.title}
                            </h1>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="text-right">
                                <p className="kq-pixel text-[9px] text-[var(--sunny)]">ANSWERS</p>
                                <p className="text-2xl font-extrabold text-[var(--on-arcade)]">
                                    {answeredCount}{" "}
                                    <span className="text-base text-[#bb9fff]">
                                        / {gameData.players.length}
                                    </span>
                                </p>
                            </div>
                            <div
                                className={`kq-timer text-3xl ${
                                    timeRemaining <= 5 ? "kq-timer-danger" : ""
                                }`}
                                aria-label={`เหลือเวลา ${timeRemaining} วินาที`}
                            >
                                {timeRemaining}
                            </div>
                        </div>
                    </header>

                    <div className="kq-shell-wide mt-5">
                        <Progress
                            value={(timeRemaining / currentQuestion.timeLimit) * 100}
                            className="h-5"
                        />
                    </div>

                    <div className="kq-shell flex flex-1 flex-col gap-6 py-5">
                        <h2 className="kq-title-xl text-center text-[clamp(1.7rem,4vw,3.1rem)]">
                            {currentQuestion.questionText}
                        </h2>

                        <div className="grid min-h-0 flex-1 gap-4 sm:grid-cols-2 sm:grid-rows-2">
                            {currentQuestion.answers.map((answer, idx) => (
                                <div
                                    key={answer.id}
                                    className={`kq-answer pointer-events-none min-h-[7rem] cursor-default ${getColorClass(
                                        answer.color
                                    )}`}
                                >
                                    <span className="kq-answer-shape kq-pixel text-[10px]">
                                        {answerLetters[idx]}
                                    </span>
                                    <span className="flex-1 text-[clamp(1.1rem,2.1vw,2rem)] font-bold leading-snug break-words">
                                        {answer.answerText}
                                    </span>
                                    <span
                                        aria-hidden
                                        className="kq-pixel hidden text-2xl text-[#211543]/25 lg:block"
                                    >
                                        {answerGlyphs[idx]}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <footer className="kq-shell-wide flex flex-wrap items-center justify-between gap-4 pb-8">
                        <div className="kq-stat">
                            <span className="kq-stat-icon">
                                <Users className="size-5" strokeWidth={2.5} />
                            </span>
                            <span>
                                <span className="kq-stat-value block text-2xl">
                                    {answeredCount} / {gameData.players.length}
                                </span>
                                <span className="kq-stat-label block">ตอบแล้ว</span>
                            </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                            <button
                                type="button"
                                onClick={handleShowAnswer}
                                disabled={isUpdating}
                                className="kq-btn kq-btn-paper kq-btn-lg"
                            >
                                <SkipForward className="size-5" />
                                แสดงคำตอบ
                            </button>
                            <button
                                type="button"
                                onClick={handleNextQuestion}
                                disabled={isUpdating}
                                className="kq-btn kq-btn-purple kq-btn-lg"
                            >
                                <ChevronRight className="size-5" />
                                ข้อต่อไป
                            </button>
                            <button
                                type="button"
                                onClick={handleEndGame}
                                disabled={isUpdating}
                                className="kq-btn kq-btn-danger kq-btn-lg"
                            >
                                <X className="size-5" />
                                จบเกม
                            </button>
                        </div>
                    </footer>
                </div>
            )}

            {/* ════════════════════ SHOWING ANSWER ════════════════════ */}
            {gameData.status === "SHOWING_ANSWER" && currentQuestion && (
                <div className="relative z-10 flex min-h-dvh flex-col">
                    <header className="kq-shell-wide flex flex-wrap items-center justify-between gap-4 pt-6">
                        <div className="min-w-0">
                            <p className="kq-overline text-[var(--sunny)]">ANSWER REVEAL</p>
                            <h1 className="truncate text-[clamp(1.2rem,2.4vw,1.9rem)] font-extrabold text-[var(--on-arcade)]">
                                {gameData.quiz.title}
                            </h1>
                        </div>
                        <span className="kq-badge kq-badge-cyan text-[10px]">
                            เฉลยข้อ {gameData.currentQuestionIndex + 1} /{" "}
                            {gameData.quiz.questions.length}
                        </span>
                    </header>

                    <div className="kq-shell flex flex-1 flex-col gap-5 py-4">
                        <h2 className="text-center text-[clamp(1.4rem,3vw,2.4rem)] font-extrabold leading-snug text-[#f2e6ff]">
                            {currentQuestion.questionText}
                        </h2>

                        <div className="grid min-h-0 flex-1 gap-4 sm:grid-cols-2 sm:grid-rows-2">
                            {currentQuestion.answers.map((answer, idx) => (
                                <div
                                    key={answer.id}
                                    className={`kq-answer pointer-events-none cursor-default ${getColorClass(
                                        answer.color
                                    )} ${
                                        answer.isCorrect ? "kq-answer-correct" : "kq-answer-dim"
                                    }`}
                                >
                                    <span className="kq-answer-shape kq-pixel text-[10px]">
                                        {answerLetters[idx]}
                                    </span>
                                    <span className="flex-1 text-[clamp(1.1rem,2.1vw,2rem)] font-bold leading-snug break-words">
                                        {answer.answerText}
                                    </span>
                                    {answer.isCorrect ? (
                                        <span
                                            aria-label="คำตอบที่ถูกต้อง"
                                            className="grid size-11 flex-none animate-bounce-in place-items-center border-[3px] border-line bg-[var(--sunny)] text-[#211543] shadow-hard-sm"
                                        >
                                            <Check className="size-6" strokeWidth={3.5} />
                                        </span>
                                    ) : (
                                        <span
                                            aria-label="คำตอบที่ผิด"
                                            className="grid size-11 flex-none place-items-center border-[3px] border-line bg-[var(--paper)] text-[#211543]"
                                        >
                                            <X className="size-6" strokeWidth={3} />
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    <footer className="kq-shell-wide flex flex-wrap items-center justify-between gap-4 pb-8">
                        <div className="kq-stat">
                            <span className="kq-stat-icon">
                                <Users className="size-5" strokeWidth={2.5} />
                            </span>
                            <span>
                                <span className="kq-stat-value block text-2xl">
                                    {answeredCount} / {gameData.players.length}
                                </span>
                                <span className="kq-stat-label block">ตอบในข้อนี้</span>
                            </span>
                        </div>

                        <button
                            type="button"
                            onClick={handleShowLeaderboard}
                            disabled={isUpdating}
                            className="kq-btn kq-btn-yellow kq-btn-lg"
                        >
                            <Trophy className="size-5" />
                            ดูอันดับ
                        </button>
                    </footer>
                </div>
            )}

            {/* ════════════════════ LEADERBOARD ════════════════════ */}
            {gameData.status === "LEADERBOARD" && (
                <div className="relative z-10 flex min-h-dvh flex-col">
                    <header className="kq-shell-wide flex flex-col items-center gap-3 pt-8 text-center">
                        <ArcadeSprite kind="trophy" className="size-20 animate-float" />
                        <div>
                            <p className="kq-overline text-[var(--sunny)]">LEADERBOARD</p>
                            <h1 className="kq-title-xl">TOP 5</h1>
                        </div>
                        <p className="text-sm font-semibold text-[#f2e6ff]">
                            หลังข้อ {gameData.currentQuestionIndex + 1} /{" "}
                            {gameData.quiz.questions.length}
                        </p>
                    </header>

                    <div className="kq-shell mt-6 flex flex-1 flex-col gap-3 pb-6">
                        {[...gameData.players]
                            .sort((a, b) => b.score - a.score)
                            .slice(0, 5)
                            .map((player, index) => (
                                <div
                                    key={player.id}
                                    className="kq-leader-row animate-slide-up text-lg lg:text-2xl"
                                    style={{ animationDelay: `${index * 90}ms` }}
                                >
                                    <span
                                        className={`kq-rank ${
                                            index === 0
                                                ? "kq-rank-1"
                                                : index === 1
                                                  ? "kq-rank-2"
                                                  : index === 2
                                                    ? "kq-rank-3"
                                                    : "bg-[var(--paper)]"
                                        }`}
                                    >
                                        {index + 1}
                                    </span>

                                    <span className="min-w-0 flex-1 truncate font-extrabold text-ink">
                                        {player.nickname}
                                    </span>

                                    {index === 0 ? (
                                        <ArcadeSprite
                                            kind="trophy"
                                            className="size-8 flex-none"
                                            title="ผู้ชนะอันดับ 1"
                                        />
                                    ) : null}

                                    <span className="flex-none border-[3px] border-line bg-[var(--arcade-deep)] px-3 py-1">
                                        <span className="kq-stat-value text-base lg:text-xl">
                                            {player.score.toLocaleString()}
                                        </span>
                                    </span>
                                </div>
                            ))}
                    </div>

                    <footer className="kq-shell flex justify-center pb-8">
                        <button
                            type="button"
                            onClick={handleNextQuestion}
                            disabled={isUpdating}
                            className="kq-btn kq-btn-yellow kq-btn-lg max-w-md kq-btn-block"
                        >
                            {gameData.currentQuestionIndex + 1 >=
                            gameData.quiz.questions.length
                                ? "จบเกม"
                                : "ข้อต่อไป"}
                            <ChevronRight className="size-5" />
                        </button>
                    </footer>
                </div>
            )}

            {/* ════════════════════ FINISHED ════════════════════ */}
            {gameData.status === "FINISHED" && (
                <div className="relative z-10 flex min-h-dvh flex-col items-center">
                    {/* Confetti */}
                    <div
                        aria-hidden
                        className="pointer-events-none absolute inset-0 overflow-hidden"
                    >
                        {[...Array(30)].map((_, i) => (
                            <div
                                key={i}
                                className="absolute size-3 animate-float lg:size-5"
                                style={{
                                    backgroundColor: [
                                        "var(--sunny)",
                                        "var(--electric)",
                                        "var(--candy)",
                                        "var(--mint)",
                                        "var(--peach)",
                                        "var(--grape)",
                                    ][Math.floor(Math.random() * 6)],
                                    top: `${Math.random() * 100}%`,
                                    left: `${Math.random() * 100}%`,
                                    animationDuration: `${3 + Math.random() * 4}s`,
                                    animationDelay: `-${Math.random() * 5}s`,
                                    opacity: 0.7,
                                }}
                            />
                        ))}
                    </div>

                    <header className="relative z-10 flex flex-col items-center gap-2 px-4 pt-8 text-center">
                        <ArcadeSprite kind="trophy" className="size-24 animate-float" />
                        <p className="kq-overline text-[var(--sunny)]">GAME OVER</p>
                        <h1 className="kq-title-xl animate-bounce-in text-[clamp(2.4rem,6vw,4.5rem)]">
                            จบเกม
                        </h1>
                        <p className="text-base font-semibold text-[#f2e6ff]">
                            อันดับสุดท้าย • {gameData.quiz.title}
                        </p>
                    </header>

                    {/* Podium */}
                    <div className="relative z-10 flex w-full max-w-5xl flex-1 items-end justify-center px-3 pb-4">
                        <div className="flex h-[46vh] max-h-[440px] w-full items-end justify-center gap-3 lg:gap-6">
                            {(() => {
                                const sorted = [...gameData.players].sort(
                                    (a, b) => b.score - a.score
                                );
                                const topThree = sorted.slice(0, 3);
                                return (
                                    <>
                                        {/* 2nd Place */}
                                        {topThree[1] && (
                                            <div className="flex h-[68%] min-w-0 flex-1 flex-col items-center">
                                                <div className="mb-2 grid size-12 flex-none animate-bounce-in place-items-center border-[3px] border-line bg-[var(--electric)] text-[#211543] shadow-hard-sm lg:size-16">
                                                    <span className="kq-pixel text-sm">2</span>
                                                </div>
                                                <div className="flex w-full flex-1 flex-col items-center gap-2 border-[3px] border-line bg-[var(--arcade)] px-2 pt-3 text-center">
                                                    <p className="w-full truncate text-base font-extrabold text-[var(--on-arcade)] lg:text-2xl">
                                                        {topThree[1].nickname}
                                                    </p>
                                                    <span className="kq-stat-value text-sm lg:text-lg">
                                                        {topThree[1].score.toLocaleString()}
                                                    </span>
                                                </div>
                                            </div>
                                        )}

                                        {/* 1st Place */}
                                        {topThree[0] && (
                                            <div className="z-20 flex h-[90%] min-w-0 flex-1 flex-col items-center">
                                                <ArcadeSprite
                                                    kind="trophy"
                                                    className="mb-1 size-12 flex-none animate-float lg:size-16"
                                                    title="ถ้วยรางวัลผู้ชนะ"
                                                />
                                                <div className="mb-2 grid size-14 flex-none animate-bounce-in place-items-center border-[3px] border-line bg-[var(--sunny)] text-[#211543] shadow-hard-sm lg:size-20">
                                                    <span className="kq-pixel text-base">1</span>
                                                </div>
                                                <div className="flex w-full flex-1 flex-col items-center gap-2 border-[3px] border-line bg-[var(--grape)] px-2 pt-4 text-center shadow-hard-lg">
                                                    <p className="w-full truncate text-lg font-extrabold text-[var(--on-arcade)] lg:text-3xl">
                                                        {topThree[0].nickname}
                                                    </p>
                                                    <span className="kq-stat-value text-lg lg:text-2xl">
                                                        {topThree[0].score.toLocaleString()}
                                                    </span>
                                                </div>
                                            </div>
                                        )}

                                        {/* 3rd Place */}
                                        {topThree[2] && (
                                            <div className="flex h-[52%] min-w-0 flex-1 flex-col items-center">
                                                <div className="mb-2 grid size-12 flex-none animate-bounce-in place-items-center border-[3px] border-line bg-[var(--peach)] text-[#211543] shadow-hard-sm lg:size-16">
                                                    <span className="kq-pixel text-sm">3</span>
                                                </div>
                                                <div className="flex w-full flex-1 flex-col items-center gap-2 border-[3px] border-line bg-[var(--arcade)] px-2 pt-3 text-center">
                                                    <p className="w-full truncate text-base font-extrabold text-[var(--on-arcade)] lg:text-2xl">
                                                        {topThree[2].nickname}
                                                    </p>
                                                    <span className="kq-stat-value text-sm lg:text-lg">
                                                        {topThree[2].score.toLocaleString()}
                                                    </span>
                                                </div>
                                            </div>
                                        )}
                                    </>
                                );
                            })()}
                        </div>
                    </div>

                    <footer className="relative z-10 flex w-full max-w-2xl flex-wrap items-center justify-center gap-3 px-4 pb-10">
                        <Link href="/quizzes" className="kq-btn kq-btn-paper kq-btn-lg">
                            <ArrowLeft className="size-5" />
                            กลับแดชบอร์ด
                        </Link>
                        <Link
                            href={`/quizzes/${gameData.quiz.id}/host`}
                            className="kq-btn kq-btn-yellow kq-btn-lg"
                        >
                            <Play className="size-5" />
                            เล่นอีกครั้ง
                        </Link>
                    </footer>
                </div>
            )}
        </div>
    );
}
