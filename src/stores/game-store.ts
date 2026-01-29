import { create } from "zustand";

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
    type: "MULTIPLE_CHOICE" | "TRUE_FALSE" | "TYPE_ANSWER";
    timeLimit: number;
    points: number;
    imageUrl: string | null;
    order: number;
    answers: Answer[];
}

interface Quiz {
    id: string;
    title: string;
    description: string | null;
    questions: Question[];
}

interface Player {
    id: string;
    nickname: string;
    score: number;
    rank: number;
    hasAnswered?: boolean;
}

type GameStatus = "LOBBY" | "PLAYING" | "QUESTION" | "SHOWING_ANSWER" | "LEADERBOARD" | "FINISHED";

interface GameState {
    // Game Session
    pin: string | null;
    status: GameStatus;
    quiz: Quiz | null;
    players: Player[];

    // Current Question
    currentQuestionIndex: number;
    timeRemaining: number;
    answeredCount: number;

    // Player State (for player view)
    playerId: string | null;
    playerNickname: string | null;
    hasAnswered: boolean;
    lastAnswerCorrect: boolean | null;
    lastPointsEarned: number;

    // Actions
    setGameSession: (data: {
        pin: string;
        status: GameStatus;
        quiz: Quiz;
        players: Player[];
        currentQuestionIndex: number;
    }) => void;
    setStatus: (status: GameStatus) => void;
    setPlayers: (players: Player[]) => void;
    addPlayer: (player: Player) => void;
    removePlayer: (playerId: string) => void;
    setCurrentQuestion: (index: number) => void;
    setTimeRemaining: (time: number) => void;
    incrementAnsweredCount: () => void;
    resetAnsweredCount: () => void;

    // Player Actions
    setPlayer: (id: string, nickname: string) => void;
    setHasAnswered: (hasAnswered: boolean) => void;
    setAnswerResult: (isCorrect: boolean, points: number) => void;

    // Reset
    resetGame: () => void;
}

const initialState = {
    pin: null,
    status: "LOBBY" as GameStatus,
    quiz: null,
    players: [],
    currentQuestionIndex: 0,
    timeRemaining: 0,
    answeredCount: 0,
    playerId: null,
    playerNickname: null,
    hasAnswered: false,
    lastAnswerCorrect: null,
    lastPointsEarned: 0,
};

export const useGameStore = create<GameState>()((set) => ({
    ...initialState,

    setGameSession: (data) => {
        set({
            pin: data.pin,
            status: data.status,
            quiz: data.quiz,
            players: data.players,
            currentQuestionIndex: data.currentQuestionIndex,
        });
    },

    setStatus: (status) => {
        set({ status });
    },

    setPlayers: (players) => {
        set({ players });
    },

    addPlayer: (player) => {
        set((state) => ({
            players: [...state.players, player],
        }));
    },

    removePlayer: (playerId) => {
        set((state) => ({
            players: state.players.filter((p) => p.id !== playerId),
        }));
    },

    setCurrentQuestion: (index) => {
        set({
            currentQuestionIndex: index,
            hasAnswered: false,
            answeredCount: 0,
            lastAnswerCorrect: null,
            lastPointsEarned: 0,
        });
    },

    setTimeRemaining: (time) => {
        set({ timeRemaining: time });
    },

    incrementAnsweredCount: () => {
        set((state) => ({
            answeredCount: state.answeredCount + 1,
        }));
    },

    resetAnsweredCount: () => {
        set({ answeredCount: 0 });
    },

    setPlayer: (id, nickname) => {
        set({ playerId: id, playerNickname: nickname });
    },

    setHasAnswered: (hasAnswered) => {
        set({ hasAnswered });
    },

    setAnswerResult: (isCorrect, points) => {
        set({
            lastAnswerCorrect: isCorrect,
            lastPointsEarned: points,
        });
    },

    resetGame: () => {
        set(initialState);
    },
}));
