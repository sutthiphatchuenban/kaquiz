import { Server as NetServer, Socket } from "net";
import { Server as SocketIOServer } from "socket.io";
import { NextApiResponse } from "next";

export interface NextApiResponseServerIO extends NextApiResponse {
    socket: Socket & {
        server: NetServer & {
            io?: SocketIOServer;
        };
    };
}

// Socket events
export interface ServerToClientEvents {
    "game:player-joined": (data: { playerId: string; nickname: string }) => void;
    "game:player-left": (data: { playerId: string }) => void;
    "game:started": () => void;
    "game:question": (data: { questionIndex: number }) => void;
    "game:show-answer": () => void;
    "game:leaderboard": () => void;
    "game:ended": () => void;
    "game:answer-received": (data: { playerId: string }) => void;
}

export interface ClientToServerEvents {
    "host:create-room": (data: { pin: string }) => void;
    "host:start-game": (data: { pin: string }) => void;
    "host:next-question": (data: { pin: string; questionIndex: number }) => void;
    "host:show-answer": (data: { pin: string }) => void;
    "host:show-leaderboard": (data: { pin: string }) => void;
    "host:end-game": (data: { pin: string }) => void;
    "player:join": (data: { pin: string; playerId: string; nickname: string }) => void;
    "player:answer": (data: { pin: string; playerId: string }) => void;
    "player:leave": (data: { pin: string; playerId: string }) => void;
}
