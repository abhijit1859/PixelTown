import { io, type Socket } from "socket.io-client";

export class SocketService {
    private socket: Socket | null = null;

    connect(serverUrl: string, token: string) {
        if (!this.socket) {
            this.socket = io(serverUrl, {
                auth: { token },
                withCredentials: true
            });

            this.socket.on("connect_error", (err) => {
                console.error("Socket Auth Shield Blocked Connection:", err.message);
            });
        }
        return this.socket;
    }

    onCurrentPlayers(callback: (players: Record<string, any>) => void) {
        this.socket?.on("currentPlayers", callback);
    }

    onNewPlayer(callback: (playerInfo: any) => void) {
        this.socket?.on("newPlayer", callback);
    }

    onPlayerMoved(callback: (playerInfo: any) => void) {
        this.socket?.on("playerMoved", callback);
    }

    onPlayerDisconnected(callback: (playerId: string) => void) {
        this.socket?.on("playerDisconnected", callback);
    }

    emitMovement(coords: { x: number; y: number; anim: string }) {
        this.socket?.emit("playerMovement", coords);
    }

    getSocketId() {
        return this.socket?.id;
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
    }
}

export const socketService = new SocketService();