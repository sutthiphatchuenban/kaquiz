"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { io, Socket } from "socket.io-client";
import type { ServerToClientEvents, ClientToServerEvents } from "@/types/socket";

type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socket: TypedSocket | null = null;

export function useSocket() {
    const [isConnected, setIsConnected] = useState(socket?.connected || false);
    const listenersRef = useRef<Map<string, Set<Function>>>(new Map());

    const emitWithRetry = useCallback((event: keyof ClientToServerEvents, data: any) => {
        if (socket?.connected) {
            socket.emit(event as any, data);
        } else {
            const handleConnect = () => {
                socket?.emit(event as any, data);
                socket?.off("connect", handleConnect);
            };
            socket?.on("connect", handleConnect);
        }
    }, []);

    useEffect(() => {
        if (!socket) {
            const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL;

            if (socketUrl) {
                // External Socket Server (e.g., Render/Railway)
                socket = io(socketUrl, {
                    transports: ["websocket"],
                }) as TypedSocket;

                socket.on("connect", () => {
                    setIsConnected(true);
                    console.log("External Socket connected");
                    listenersRef.current.forEach((callbacks, event) => {
                        callbacks.forEach(cb => socket?.on(event as any, cb as any));
                    });
                });

                socket.on("disconnect", () => {
                    setIsConnected(false);
                    console.log("Socket disconnected");
                });
            } else {
                // Internal Next.js API Route (Localhost only)
                fetch("/api/socket/io").finally(() => {
                    if (socket) return; // Prevent double init

                    socket = io({
                        path: "/api/socket/io",
                        transports: ["websocket"],
                    }) as TypedSocket;

                    socket.on("connect", () => {
                        setIsConnected(true);
                        console.log("Socket connected");

                        listenersRef.current.forEach((callbacks, event) => {
                            callbacks.forEach(cb => socket?.on(event as any, cb as any));
                        });
                    });

                    socket.on("disconnect", () => {
                        setIsConnected(false);
                        console.log("Socket disconnected");
                    });
                });
            }
        } else {
            setIsConnected(socket.connected);
        }

        return () => {
            // We don't disconnect globally here because multiple components might use it
        };
    }, []);

    const addListener = useCallback((event: string, callback: Function) => {
        if (!listenersRef.current.has(event)) {
            listenersRef.current.set(event, new Set());
        }
        listenersRef.current.get(event)?.add(callback);
        socket?.on(event as any, callback as any);

        return () => {
            listenersRef.current.get(event)?.delete(callback);
            socket?.off(event as any, callback as any);
        };
    }, []);

    // Host methods
    const createRoom = useCallback((pin: string) => {
        emitWithRetry("host:create-room", { pin });
    }, [emitWithRetry]);

    const startGame = useCallback((pin: string) => {
        emitWithRetry("host:start-game", { pin });
    }, [emitWithRetry]);

    const nextQuestion = useCallback((pin: string, questionIndex: number) => {
        emitWithRetry("host:next-question", { pin, questionIndex });
    }, [emitWithRetry]);

    const showAnswer = useCallback((pin: string) => {
        emitWithRetry("host:show-answer", { pin });
    }, [emitWithRetry]);

    const showLeaderboard = useCallback((pin: string) => {
        emitWithRetry("host:show-leaderboard", { pin });
    }, [emitWithRetry]);

    const endGame = useCallback((pin: string) => {
        emitWithRetry("host:end-game", { pin });
    }, [emitWithRetry]);

    // Player methods
    const joinGame = useCallback((pin: string, playerId: string, nickname: string) => {
        emitWithRetry("player:join", { pin, playerId, nickname });
    }, [emitWithRetry]);

    const submitAnswer = useCallback((pin: string, playerId: string) => {
        emitWithRetry("player:answer", { pin, playerId });
    }, [emitWithRetry]);

    const leaveGame = useCallback((pin: string, playerId: string) => {
        emitWithRetry("player:leave", { pin, playerId });
    }, [emitWithRetry]);

    // Event listeners
    const onPlayerJoined = useCallback((callback: (data: { playerId: string; nickname: string }) => void) => {
        return addListener("game:player-joined", callback);
    }, [addListener]);

    const onPlayerLeft = useCallback((callback: (data: { playerId: string }) => void) => {
        return addListener("game:player-left", callback);
    }, [addListener]);

    const onGameStarted = useCallback((callback: () => void) => {
        return addListener("game:started", callback);
    }, [addListener]);

    const onQuestion = useCallback((callback: (data: { questionIndex: number }) => void) => {
        return addListener("game:question", callback);
    }, [addListener]);

    const onShowAnswer = useCallback((callback: () => void) => {
        return addListener("game:show-answer", callback);
    }, [addListener]);

    const onLeaderboard = useCallback((callback: () => void) => {
        return addListener("game:leaderboard", callback);
    }, [addListener]);

    const onGameEnded = useCallback((callback: () => void) => {
        return addListener("game:ended", callback);
    }, [addListener]);

    const onAnswerReceived = useCallback((callback: (data: { playerId: string }) => void) => {
        return addListener("game:answer-received", callback);
    }, [addListener]);

    return {
        socket,
        isConnected,
        createRoom,
        startGame,
        nextQuestion,
        showAnswer,
        showLeaderboard,
        endGame,
        joinGame,
        submitAnswer,
        leaveGame,
        onPlayerJoined,
        onPlayerLeft,
        onGameStarted,
        onQuestion,
        onShowAnswer,
        onLeaderboard,
        onGameEnded,
        onAnswerReceived,
    };
}

export { socket };
