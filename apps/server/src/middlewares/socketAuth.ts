import type { NextFunction } from "express";
import type { Socket } from "socket.io";

export interface AuthenticatedSocket extends Socket{
    user?:{
        id:String;
        username:string
    }
}

export const socketAuthMiddleware=(socket:AuthenticatedSocket,next:NextFunction)=>{
    const token=socket.handshake.auth?.token||socket.handshake.headers['authorization'];

    if(!token){
        return new Error("authentication failed")
    }

    try {
        
    } catch (error) {
        
    }
}