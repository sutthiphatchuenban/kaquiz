// Re-export all types from Prisma
export type {
    User,
    Quiz,
    Question,
    Answer,
    GameSession,
    Player,
    PlayerAnswer,
    QuestionType,
    GameStatus,
} from "@/generated/prisma";

// API Response types
export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}

// Auth types
export interface AuthUser {
    id: string;
    email: string;
    name: string;
    avatar?: string | null;
}

export interface SessionUser extends AuthUser {
    accessToken?: string;
}

// Quiz types with relations
export interface QuizWithQuestions {
    id: string;
    title: string;
    description: string | null;
    coverImage: string | null;
    isPublished: boolean;
    createdAt: Date;
    updatedAt: Date;
    userId: string;
    questions: QuestionWithAnswers[];
}

export interface QuestionWithAnswers {
    id: string;
    questionText: string;
    type: "MULTIPLE_CHOICE" | "TRUE_FALSE" | "TYPE_ANSWER";
    timeLimit: number;
    points: number;
    imageUrl: string | null;
    order: number;
    quizId: string;
    answers: AnswerOption[];
}

export interface AnswerOption {
    id: string;
    answerText: string;
    isCorrect: boolean;
    color: "red" | "blue" | "green" | "yellow";
    order: number;
    questionId: string;
}

// Game types
export interface GameState {
    pin: string;
    status: "LOBBY" | "PLAYING" | "QUESTION" | "SHOWING_ANSWER" | "LEADERBOARD" | "FINISHED";
    currentQuestionIndex: number;
    players: PlayerState[];
    quiz?: QuizWithQuestions;
    currentQuestion?: QuestionWithAnswers;
    timeRemaining?: number;
}

export interface PlayerState {
    id: string;
    nickname: string;
    score: number;
    rank: number;
    hasAnswered?: boolean;
    lastAnswerCorrect?: boolean;
    lastPointsEarned?: number;
}

export interface LeaderboardEntry {
    rank: number;
    playerId: string;
    nickname: string;
    score: number;
    correctAnswers: number;
    totalQuestions: number;
}

// Socket event types
export interface ServerToClientEvents {
    "game:player-joined": (player: PlayerState) => void;
    "game:player-left": (playerId: string) => void;
    "game:started": () => void;
    "game:question": (data: { question: QuestionWithAnswers; questionNumber: number; totalQuestions: number }) => void;
    "game:timer": (timeRemaining: number) => void;
    "game:time-up": () => void;
    "game:answer-received": (data: { count: number; total: number }) => void;
    "game:result": (data: { isCorrect: boolean; points: number; rank: number }) => void;
    "game:showing-answer": (data: { correctAnswerId: string; stats: AnswerStats }) => void;
    "game:leaderboard": (leaderboard: LeaderboardEntry[]) => void;
    "game:ended": (finalLeaderboard: LeaderboardEntry[]) => void;
    "game:error": (error: string) => void;
}

export interface ClientToServerEvents {
    "host:create-room": (data: { quizId: string }) => void;
    "host:start-game": () => void;
    "host:next-question": () => void;
    "host:show-answer": () => void;
    "host:show-leaderboard": () => void;
    "host:end-game": () => void;
    "player:join": (data: { pin: string; nickname: string }) => void;
    "player:answer": (data: { answerId: string; responseTime: number }) => void;
    "player:leave": () => void;
}

export interface AnswerStats {
    [answerId: string]: number; // count of players who chose each answer
}

// Component prop types
export interface AnswerButtonProps {
    label: string;
    color: "red" | "blue" | "green" | "yellow";
    onClick: () => void;
    disabled?: boolean;
    selected?: boolean;
    showResult?: boolean;
    isCorrect?: boolean;
}
