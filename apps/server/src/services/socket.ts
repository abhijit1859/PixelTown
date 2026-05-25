import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { socketAuthMiddleware, type AuthenticatedSocket } from '../middlewares/socketAuth.js';

interface PlayerState {
    playerId: string;
    username: string;
    x: number;
    y: number;
    anim: string;
}

class SocketService {
    private io?: Server;
    private activePlayers: Record<string, PlayerState> = {};

    public init(httpServer: HttpServer) {
        this.io = new Server(httpServer, {
            cors: {
                origin: (requestOrigin, callback) => {
                    const allowedOrigins = [
                        'http://localhost:3000',
                        'http://localhost:5173',
                        'http://192.168.0.106:3000'
                    ];
                    if (!requestOrigin || allowedOrigins.indexOf(requestOrigin) !== -1) {
                        callback(null, true);
                    } else {
                        callback(new Error('Not allowed by Socket CORS'));
                    }
                },
                methods: ["GET", "POST"],
                credentials: true
            }
        });

        this.io.use(socketAuthMiddleware);

        this.io.on("connection", (rawSocket: Socket) => {
            const socket = rawSocket as AuthenticatedSocket;
            const user = socket.user;
            if (!user) return socket.disconnect(true);

            console.log(`User connected: ${user.username}`);

            const randomOffset = Math.floor(Math.random() * 3) * 32;

            this.activePlayers[socket.id] = {
                playerId: socket.id,
                username: user.username,
                x: 192 + randomOffset,
                y: 192,
                anim: ""
            };

            socket.on("player-ready", () => {
                socket.emit("currentPlayers", this.activePlayers);
                socket.broadcast.emit("newPlayer", this.activePlayers[socket.id]);
            });

            socket.on("playerMovement", (movementData: { x: number; y: number; anim: string }) => {
                if (this.activePlayers[socket.id]) {
                    this.activePlayers[socket.id]!.x = movementData.x;
                    this.activePlayers[socket.id]!.y = movementData.y;
                    this.activePlayers[socket.id]!.anim = movementData.anim;
                    socket.broadcast.emit("playerMoved", this.activePlayers[socket.id]);
                }
            });

            // ---------------- P2P WEBRTC SIGNALING ROUTER HOOKS ----------------
            socket.on("video-offer", (data: { targetId: string; offer: any }) => {
                socket.to(data.targetId).emit("video-offer", { senderId: socket.id, offer: data.offer });
            });

            socket.on("video-answer", (data: { targetId: string; answer: any }) => {
                socket.to(data.targetId).emit("video-answer", { senderId: socket.id, answer: data.answer });
            });

            socket.on("ice-candidate", (data: { targetId: string; candidate: any }) => {
                socket.to(data.targetId).emit("ice-candidate", { senderId: socket.id, candidate: data.candidate });
            });

            socket.on("video-hangup", (data: { targetId: string }) => {
                socket.to(data.targetId).emit("video-hangup");
            });

            socket.on("disconnect", () => {
                console.log(`User disconnected: ${user.username}`);
                delete this.activePlayers[socket.id];
                this.io?.emit("playerDisconnected", socket.id);
            });
        });
    }

    public getIo(): Server {
        if (!this.io) throw new Error("socket has not been initialized");
        return this.io;
    }
}

export const socketService = new SocketService();