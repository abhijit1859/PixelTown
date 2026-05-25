import type { Socket } from "socket.io";
import jwt from "jsonwebtoken";
import cookie from "cookie";

 
const JWT_SECRET = process.env.ACCESS_TOKEN_SECRET || "your_fallback_secret";

export interface AuthenticatedSocket extends Socket {
    user?: {
        id: string;
        username: string;
    };
}

export const socketAuthMiddleware = (socket: AuthenticatedSocket, next: (err?: any) => void) => {
    let token = socket.handshake.auth?.token || socket.handshake.headers['authorization'];

    // Cookie fallback check
    if (!token && socket.handshake.headers.cookie) {
        const parsedCookies = cookie.parse(socket.handshake.headers.cookie);
        token = parsedCookies['token']; 
    }

    if (!token) {
        return next(new Error("Authentication failed: Access Token missing"));
    }

    const cleanToken = token.startsWith("Bearer ") ? token.split(" ")[1] : token;

    try {
        const decoded = jwt.verify(cleanToken, JWT_SECRET) as { id: string; username: string };
        socket.user = {
            id: decoded.id,
            username: decoded.username
        };
        next();
    } catch (error) {
        return next(new Error("Authentication failed: Invalid token validation"));
    }
};