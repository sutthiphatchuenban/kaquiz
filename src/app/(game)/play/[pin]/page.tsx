"use client";

import { useState, useEffect, use, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useGameStore } from "@/stores/game-store";
import { useSocket } from "@/hooks/use-socket";
import {
    Check,
    Clock,
    Gamepad2,
    Loader2,
    RotateCcw,
    Trophy,
    Users,
    X,
} from "lucide-react";
import { toast } from "sonner";

import { ArcadeSprite } from "@/components/arcade-sprite";
import { Marquee } from "@/components/marquee";

const ANSWER_LETTERS = ["A", "B", "C", "D"];

const getColorClass = (color: string) => {
    const colors: Record<string, string> = {
        red: "kq-answer-red",
        blue: "kq-answer-blue",
        green: "kq-answer-green",
        yellow: "kq-answer-yellow",
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
    startedAt: string | null;
    quiz: {
        title: string;
        questions: Question[];
    };
    players: { id: string; nickname: string; score: number }[];
}

function PlayerBar({ nickname, score }: { nickname: string; score: number }) {
    return (
        <header className="flex items-center justify-between gap-3 px-4 pt-4">
            <span className="kq-badge kq-badge-cyan min-w-0">
                <Gamepad2 className="size-3.5 flex-none" />
                <span className="truncate">{nickname}</span>
            </span>
            <span className="kq-badge flex-none">
                <Trophy className="size-3.5" />
                {score.toLocaleString()}
            </span>
        </header>
    );
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
    const [timerTick, setTimerTick] = useState(0);

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

    // Compute timeRemaining from server startedAt so host & player stay in sync
    const computedTimeRemaining = useCallback(() => {
        if (gameData?.status !== "QUESTION" || !gameData?.startedAt) return 0;
        const currentQuestion = gameData.quiz.questions[gameData.currentQuestionIndex];
        if (!currentQuestion) return 0;
        const elapsed = Math.floor((Date.now() - new Date(gameData.startedAt).getTime()) / 1000);
        return Math.max(0, currentQuestion.timeLimit - elapsed);
    }, [gameData?.status, gameData?.startedAt, gameData?.currentQuestionIndex, gameData?.quiz?.questions]);

    const initializedQuestionRef = useRef<{ index: number; startedAt: string | null }>({ index: -1, startedAt: null });

    // Reset state when question changes
    useEffect(() => {
        if (gameData?.status === "QUESTION") {
            const currentQuestion = gameData.quiz.questions[gameData.currentQuestionIndex];
            const isNewQuestion = 
                initializedQuestionRef.current.index !== gameData.currentQuestionIndex ||
                initializedQuestionRef.current.startedAt !== gameData.startedAt;

            if (currentQuestion && isNewQuestion) {
                setTimeRemaining(computedTimeRemaining());
                setAnswerStartTime(Date.now());
                setSelectedAnswer(null);
                setHasAnswered(false);
                setAnswerResult(null as any, 0);

                initializedQuestionRef.current = {
                    index: gameData.currentQuestionIndex,
                    startedAt: gameData.startedAt
                };
            }
        }
    }, [gameData?.status, gameData?.currentQuestionIndex, gameData?.startedAt, computedTimeRemaining, gameData?.quiz?.questions]);

    // Tick every second to update the countdown display
    useEffect(() => {
        if (gameData?.status !== "QUESTION" || hasAnswered) return;
        const tick = setInterval(() => {
            setTimerTick((t) => t + 1);
            const remaining = computedTimeRemaining();
            setTimeRemaining(remaining);
        }, 1000);
        return () => clearInterval(tick);
    }, [gameData?.status, hasAnswered, computedTimeRemaining]);

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
            <div className="grid min-h-dvh place-items-center px-4">
                <div className="grid place-items-center gap-4 text-center">
                    <ArcadeSprite kind="bot" className="size-20 animate-float" />
                    <Loader2 className="size-10 animate-spin text-[var(--sunny)]" />
                    <p className="kq-pixel text-[9px] text-[var(--on-arcade)]">LOADING...</p>
                </div>
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
                <div className="grid min-h-dvh place-items-center px-4 py-10">
                    <div className="relative w-full max-w-md">
                        <span className="kq-sticker absolute -top-5 right-4 z-10 rotate-[7deg] px-3 py-2">
                            ROUND 01
                            <br />
                            STARTED!
                        </span>

                        <div className="kq-card p-7 text-center">
                            <ArcadeSprite kind="bot" className="mx-auto size-20" />
                            <h1 className="kq-title mt-4">เกมเริ่มแล้ว</h1>
                            <p className="kq-subtitle mt-2 text-sm">
                                ไม่สามารถเข้าร่วมได้ในขณะนี้
                            </p>
                            <button
                                type="button"
                                onClick={() => router.push("/join")}
                                className="kq-btn kq-btn-yellow kq-btn-block kq-btn-lg mt-6"
                            >
                                กลับหน้าหลัก
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return (
            <div className="grid min-h-dvh place-items-center px-4 py-10">
                <div className="relative w-full max-w-md">
                    <span className="kq-sticker absolute -left-3 -top-5 z-10 rotate-[-8deg] px-3 py-2">
                        PLAYER
                        <br />
                        READY!
                    </span>

                    <div className="kq-card">
                        <div className="kq-art relative grid place-items-center py-6">
                            <span className="kq-badge kq-badge-cyan absolute left-3 top-3">
                                PIN {pin}
                            </span>
                            <span className="grid size-20 rotate-[-4deg] place-items-center border-[3px] border-line bg-[var(--paper)] shadow-hard-sm">
                                <ArcadeSprite kind="bot" className="size-14" />
                            </span>
                        </div>

                        <div className="p-6 sm:p-7">
                            <p className="kq-overline">02 / YOUR NAME</p>
                            <h1 className="kq-title mt-2">เข้าร่วม: {gameData.quiz.title}</h1>
                            <p className="kq-subtitle mt-2 text-sm">
                                Game PIN:{" "}
                                <span className="kq-pixel-lg text-[var(--arcade)] dark:text-[var(--sunny)]">
                                    {pin}
                                </span>
                            </p>

                            <label htmlFor="nickname" className="kq-label mt-6">
                                ชื่อเล่น
                            </label>
                            <input
                                id="nickname"
                                type="text"
                                placeholder="ใส่ชื่อเล่นของคุณ"
                                value={nickname}
                                onChange={(e) => setNickname(e.target.value)}
                                className="kq-input h-14 text-center text-lg"
                                maxLength={20}
                                disabled={isJoining}
                                onKeyDown={(e) => e.key === "Enter" && handleJoin()}
                            />
                            <p className="mt-1 text-right text-xs font-bold text-muted-foreground">
                                {nickname.length}/20
                            </p>

                            <button
                                type="button"
                                onClick={handleJoin}
                                disabled={isJoining || !nickname.trim()}
                                className="kq-btn kq-btn-yellow kq-btn-block kq-btn-lg mt-4"
                            >
                                {isJoining ? (
                                    <>
                                        <Loader2 className="size-5 animate-spin" />
                                        กำลังเข้าร่วม...
                                    </>
                                ) : (
                                    "เข้าร่วมเกม"
                                )}
                            </button>
                        </div>

                        <div className="grid grid-cols-3 border-t-[3px] border-line" aria-hidden>
                            <span className="h-3 bg-[var(--candy)]" />
                            <span className="h-3 bg-[var(--electric)]" />
                            <span className="h-3 bg-[var(--sunny)]" />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // LOBBY - Waiting for game to start
    if (gameData.status === "LOBBY") {
        return (
            <div className="flex min-h-dvh flex-col">
                <PlayerBar nickname={playerNickname ?? "PLAYER"} score={myScore} />

                <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-2 px-4 py-6 text-center">
                    <p className="kq-pixel text-[9px] text-[var(--on-arcade)]">GAME PIN</p>
                    <p className="kq-pin">{pin}</p>

                    <div className="kq-card mt-5 w-full p-7">
                        <ArcadeSprite kind="bot" className="mx-auto size-24 animate-float" />

                        <h1 className="kq-title mt-4">รอเริ่มเกม...</h1>
                        <p className="kq-subtitle mt-2 text-sm">
                            เมื่อ Host เริ่มเกม คุณจะเห็นคำถามบนหน้าจอ
                        </p>

                        <hr className="kq-divider my-5" />

                        <p className="kq-label text-center">คุณเข้าร่วมในชื่อ</p>
                        <p className="text-2xl font-extrabold">{playerNickname}</p>

                        <p className="mt-4 flex items-center justify-center gap-2 text-sm font-bold text-muted-foreground">
                            <Users className="size-4" />
                            {gameData.players.length} ผู้เล่นในห้อง
                        </p>
                    </div>
                </main>

                <div className="mt-auto">
                    <Marquee
                        items={[
                            "รอ HOST เริ่มเกม",
                            "เตรียมนิ้วให้พร้อม",
                            "ตอบให้ไวที่สุด",
                            "สะสมคะแนนให้มากที่สุด",
                        ]}
                    />
                </div>
            </div>
        );
    }

    const currentQuestion = gameData.quiz.questions[gameData.currentQuestionIndex];

    // QUESTION - Answering time
    if (gameData.status === "QUESTION" && currentQuestion) {
        if (hasAnswered) {
            const chosenAnswer = currentQuestion.answers.find((a) => a.id === selectedAnswer);
            const chosenIndex = currentQuestion.answers.findIndex((a) => a.id === selectedAnswer);

            return (
                <div className="flex min-h-dvh flex-col">
                    <PlayerBar nickname={playerNickname ?? "PLAYER"} score={myScore} />

                    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-5 px-4 py-6 text-center">
                        <div className="kq-card w-full p-7">
                            <div
                                className={`mx-auto grid size-24 place-items-center border-[3px] border-line text-[var(--arcade-deep)] ${
                                    lastAnswerCorrect === null
                                        ? "bg-[var(--electric)]"
                                        : lastAnswerCorrect
                                          ? "animate-bounce-in bg-[var(--mint)]"
                                          : "animate-shake bg-[var(--candy)]"
                                }`}
                            >
                                {lastAnswerCorrect === null ? (
                                    <Clock className="size-12" />
                                ) : lastAnswerCorrect ? (
                                    <Check className="size-12" />
                                ) : (
                                    <X className="size-12" />
                                )}
                            </div>

                            {lastAnswerCorrect === null ? (
                                <h2 className="kq-title mt-5">รอผลลัพธ์...</h2>
                            ) : lastAnswerCorrect ? (
                                <>
                                    <h2 className="kq-title mt-5 text-success">ถูกต้อง!</h2>
                                    <p className="mt-2 text-xl font-extrabold">
                                        +{lastPointsEarned.toLocaleString()} คะแนน
                                    </p>
                                </>
                            ) : (
                                <h2 className="kq-title mt-5 text-destructive">ผิด!</h2>
                            )}

                            <hr className="kq-divider my-5" />

                            <div className="flex items-center justify-center gap-3">
                                <span className="kq-badge">RANK</span>
                                <span className="kq-pixel-lg text-lg text-[var(--arcade)] dark:text-[var(--sunny)]">
                                    อันดับที่ {myRank}
                                </span>
                            </div>
                        </div>

                        {chosenAnswer ? (
                            <div
                                className={`kq-answer pointer-events-none select-none ${getColorClass(
                                    chosenAnswer.color
                                )} ${
                                    lastAnswerCorrect === false
                                        ? "kq-answer-wrong"
                                        : lastAnswerCorrect
                                          ? "kq-answer-correct"
                                          : "kq-answer-dim"
                                }`}
                            >
                                <span className="kq-answer-shape">
                                    {ANSWER_LETTERS[chosenIndex] ?? "?"}
                                </span>
                                <span className="min-w-0 flex-1 break-words">
                                    {chosenAnswer.answerText}
                                </span>
                            </div>
                        ) : null}
                    </main>
                </div>
            );
        }

        return (
            <div className="flex min-h-dvh flex-col">
                <PlayerBar nickname={playerNickname ?? "PLAYER"} score={myScore} />

                <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 pb-6">
                    <div className="flex items-center justify-between gap-3">
                        <span className="kq-badge">
                            ข้อ {gameData.currentQuestionIndex + 1} / {gameData.quiz.questions.length}
                        </span>
                        <span
                            className={`kq-timer ${
                                timeRemaining <= 5 ? "kq-timer-danger" : ""
                            }`}
                        >
                            {timeRemaining}
                        </span>
                    </div>

                    <h1 className="mt-5 text-xl font-extrabold leading-snug text-[var(--on-arcade)] [text-shadow:2px_2px_0_var(--pop)] sm:text-2xl">
                        {currentQuestion.questionText}
                    </h1>

                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                        {currentQuestion.answers.map((answer, index) => (
                            <button
                                key={answer.id}
                                type="button"
                                onClick={() => handleSelectAnswer(answer.id)}
                                disabled={hasAnswered || timeRemaining === 0}
                                className={`kq-answer ${getColorClass(answer.color)} ${
                                    timeRemaining === 0 ? "kq-answer-dim" : ""
                                }`}
                            >
                                <span className="kq-answer-shape">
                                    {ANSWER_LETTERS[index] ?? "?"}
                                </span>
                                <span className="min-w-0 flex-1 break-words">
                                    {answer.answerText}
                                </span>
                            </button>
                        ))}
                    </div>
                </main>
            </div>
        );
    }

    // SHOWING_ANSWER or LEADERBOARD - Waiting
    if (gameData.status === "SHOWING_ANSWER" || gameData.status === "LEADERBOARD") {
        return (
            <div className="flex min-h-dvh flex-col">
                <PlayerBar nickname={playerNickname ?? "PLAYER"} score={myScore} />

                <main className="mx-auto flex w-full max-w-sm flex-1 flex-col items-center justify-center px-4 py-6">
                    <div className="kq-card w-full p-7 text-center">
                        <ArcadeSprite kind="trophy" className="mx-auto size-20 animate-float" />

                        <h2 className="kq-title mt-4">ดูหน้าจอหลัก!</h2>

                        <hr className="kq-divider my-5" />

                        <p className="kq-label text-center">คะแนนของคุณ</p>
                        <p className="kq-pixel-lg text-4xl text-[var(--arcade)] dark:text-[var(--sunny)]">
                            {myScore.toLocaleString()}
                        </p>
                        <p className="mt-2 text-sm font-bold text-muted-foreground">
                            อันดับที่ {myRank}
                        </p>
                    </div>
                </main>
            </div>
        );
    }

    // FINISHED
    if (gameData.status === "FINISHED") {
        return (
            <div className="flex min-h-dvh flex-col">
                <PlayerBar nickname={playerNickname ?? "PLAYER"} score={myScore} />

                <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-5 px-4 py-6 text-center">
                    <ArcadeSprite kind="trophy" className="size-28 animate-float" />

                    <h1 className="kq-title-xl">🎉 จบเกม!</h1>

                    <div className="kq-card w-full p-7">
                        <p className="kq-label text-center">คะแนนสุดท้ายของคุณ</p>
                        <p className="kq-pixel-lg text-4xl text-[var(--arcade)] dark:text-[var(--sunny)]">
                            {myScore.toLocaleString()}
                        </p>
                        <p className="mt-2 text-base font-bold text-muted-foreground">
                            อันดับที่ {myRank} จาก {gameData.players.length} คน
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={() => router.push("/join")}
                        className="kq-btn kq-btn-yellow kq-btn-block kq-btn-lg"
                    >
                        <RotateCcw className="size-5" />
                        เล่นเกมใหม่
                    </button>

                    <Link href="/" className="kq-btn kq-btn-ghost">
                        กลับหน้าหลัก
                    </Link>
                </main>
            </div>
        );
    }

    return null;
}
