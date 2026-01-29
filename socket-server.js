const { Server } = require("socket.io");
const { createServer } = require("http");

const httpServer = createServer((req, res) => {
    res.writeHead(200);
    res.end("Socket server is running");
});

const io = new Server(httpServer, {
    cors: {
        origin: "*", // Adjust this to your Vercel URL in production for security, e.g., ["https://your-app.vercel.app"]
        methods: ["GET", "POST"],
    },
});

io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);

    // Host creates a room
    socket.on("host:create-room", ({ pin }) => {
        socket.join(`game:${pin}`);
        socket.join(`host:${pin}`);
        console.log(`Host created room: ${pin}`);
    });

    // Player joins a room
    socket.on("player:join", ({ pin, playerId, nickname }) => {
        socket.join(`game:${pin}`);
        socket.data.playerId = playerId;
        socket.data.pin = pin;

        // Notify host
        io.to(`host:${pin}`).emit("game:player-joined", { playerId, nickname });
        console.log(`Player ${nickname} joined room: ${pin}`);
    });

    // Host starts the game
    socket.on("host:start-game", ({ pin }) => {
        io.to(`game:${pin}`).emit("game:started");
        console.log(`Game started: ${pin}`);
    });

    // Host shows next question
    socket.on("host:next-question", ({ pin, questionIndex }) => {
        io.to(`game:${pin}`).emit("game:question", { questionIndex });
        console.log(`Question ${questionIndex} shown for: ${pin}`);
    });

    // Host shows answer
    socket.on("host:show-answer", ({ pin }) => {
        io.to(`game:${pin}`).emit("game:show-answer");
        console.log(`Answer shown for: ${pin}`);
    });

    // Host shows leaderboard
    socket.on("host:show-leaderboard", ({ pin }) => {
        io.to(`game:${pin}`).emit("game:leaderboard");
        console.log(`Leaderboard shown for: ${pin}`);
    });

    // Host ends game
    socket.on("host:end-game", ({ pin }) => {
        io.to(`game:${pin}`).emit("game:ended");
        console.log(`Game ended: ${pin}`);
    });

    // Player submits answer
    socket.on("player:answer", ({ pin, playerId }) => {
        // Notify host that a player answered
        io.to(`host:${pin}`).emit("game:answer-received", { playerId });
        console.log(`Player ${playerId} answered in: ${pin}`);
    });

    // Player leaves
    socket.on("player:leave", ({ pin, playerId }) => {
        socket.leave(`game:${pin}`);
        io.to(`host:${pin}`).emit("game:player-left", { playerId });
        console.log(`Player ${playerId} left: ${pin}`);
    });

    // Handle disconnect
    socket.on("disconnect", () => {
        const { pin, playerId } = socket.data;
        if (pin && playerId) {
            io.to(`host:${pin}`).emit("game:player-left", { playerId });
        }
        console.log("Client disconnected:", socket.id);
    });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
    console.log(`Socket server running on port ${PORT}`);
});
