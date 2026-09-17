"use client";

import { useCallback } from "react";

/**
 * Socket compatibility layer.
 *
 * KaQuiz currently synchronizes games through API polling because Vercel does
 * not host persistent Socket.IO connections. Keeping these stable no-op
 * callbacks lets game screens use one interface without registering dead
 * listeners or retrying unavailable socket connections.
 */
export function useSocket() {
    const noop = useCallback((...args: unknown[]) => {
        void args;
    }, []);
    const subscribe = useCallback(
        <T extends (...args: never[]) => void>(callback: T) => {
            void callback;
            return noop;
        },
        [noop]
    );

    return {
        socket: null,
        isConnected: false,
        createRoom: noop,
        startGame: noop,
        nextQuestion: noop,
        showAnswer: noop,
        showLeaderboard: noop,
        endGame: noop,
        joinGame: noop,
        submitAnswer: noop,
        leaveGame: noop,
        onPlayerJoined: subscribe,
        onPlayerLeft: subscribe,
        onGameStarted: subscribe,
        onQuestion: subscribe,
        onShowAnswer: subscribe,
        onLeaderboard: subscribe,
        onGameEnded: subscribe,
        onAnswerReceived: subscribe,
    };
}

export const socket = null;
