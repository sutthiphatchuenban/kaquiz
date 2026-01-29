import { Server as NetServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import { NextApiRequest, NextApiResponse } from "next";
import { Socket } from "net";

// Define the extended response type inline
interface NextApiResponseServerIO extends NextApiResponse {
    socket: Socket & {
        server: NetServer & {
            io?: SocketIOServer;
        };
    };
}

export const config = {
    api: {
        bodyParser: false,
    },
};

let io: SocketIOServer | undefined;

export function getIO(): SocketIOServer | undefined {
    return io;
}

export default function SocketHandler(
    req: NextApiRequest,
    res: NextApiResponseServerIO
) {
    console.log("Socket API Route hit:", req.method);
    if (!res.socket.server.io) {
        console.log("Setting up Socket.io server...");
        const httpServer: NetServer = res.socket.server as unknown as NetServer;

        io = new SocketIOServer(httpServer, {
            path: "/api/socket/io",
            cors: {
                origin: "*",
                methods: ["GET", "POST"],
            },
        });

        // Game room management
        io.on("connection", (socket) => {
            console.log("Client connected:", socket.id);

            // Host creates a room
            socket.on("host:create-room", ({ pin }: { pin: string }) => {
                socket.join(`game:${pin}`);
                socket.join(`host:${pin}`);
                console.log(`Host created room: ${pin}`);
            });

            // Player joins a room
            socket.on("player:join", ({ pin, playerId, nickname }: { pin: string; playerId: string; nickname: string }) => {
                socket.join(`game:${pin}`);
                socket.data.playerId = playerId;
                socket.data.pin = pin;

                // Notify host
                io?.to(`host:${pin}`).emit("game:player-joined", { playerId, nickname });
                console.log(`Player ${nickname} joined room: ${pin}`);
            });

            // Host starts the game
            socket.on("host:start-game", ({ pin }: { pin: string }) => {
                io?.to(`game:${pin}`).emit("game:started");
                console.log(`Game started: ${pin}`);
            });

            // Host shows next question
            socket.on("host:next-question", ({ pin, questionIndex }: { pin: string; questionIndex: number }) => {
                io?.to(`game:${pin}`).emit("game:question", { questionIndex });
                console.log(`Question ${questionIndex} shown for: ${pin}`);
            });

            // Host shows answer
            socket.on("host:show-answer", ({ pin }: { pin: string }) => {
                io?.to(`game:${pin}`).emit("game:show-answer");
                console.log(`Answer shown for: ${pin}`);
            });

            // Host shows leaderboard
            socket.on("host:show-leaderboard", ({ pin }: { pin: string }) => {
                io?.to(`game:${pin}`).emit("game:leaderboard");
                console.log(`Leaderboard shown for: ${pin}`);
            });

            // Host ends game
            socket.on("host:end-game", ({ pin }: { pin: string }) => {
                io?.to(`game:${pin}`).emit("game:ended");
                console.log(`Game ended: ${pin}`);
            });

            // Player submits answer
            socket.on("player:answer", ({ pin, playerId }: { pin: string; playerId: string }) => {
                // Notify host that a player answered
                io?.to(`host:${pin}`).emit("game:answer-received", { playerId });
                console.log(`Player ${playerId} answered in: ${pin}`);
            });

            // Player leaves
            socket.on("player:leave", ({ pin, playerId }: { pin: string; playerId: string }) => {
                socket.leave(`game:${pin}`);
                io?.to(`host:${pin}`).emit("game:player-left", { playerId });
                console.log(`Player ${playerId} left: ${pin}`);
            });

            // Handle disconnect
            socket.on("disconnect", () => {
                const { pin, playerId } = socket.data;
                if (pin && playerId) {
                    io?.to(`host:${pin}`).emit("game:player-left", { playerId });
                }
                console.log("Client disconnected:", socket.id);
            });
        });

        res.socket.server.io = io;
    } else {
        io = res.socket.server.io;
    }

    res.json({ success: true, message: "Socket server is running" });
}
