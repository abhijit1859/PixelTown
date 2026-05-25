import type {Request,Response, NextFunction } from "express";
import { verifyAcessToken } from "../config/auth.config.js";


 
const JWT_SECRET = process.env.ACCESS_TOKEN_SECRET || "your_fallback_secret";
export const requireAuth=(req:Request,res:Response,next:NextFunction)=>{
    try {
        const authHeader=req.headers.authorization;
        if(!authHeader||!authHeader.startsWith('Bearer')){
            return res.status(401).json({
                message:"authorization token missing"
            })
        }

        const token=authHeader.split(' ')[1];
        const decodedUser=verifyAcessToken(token as string)
        req.user=decodedUser;
        next()
    } catch (error) {
        console.error(error)
        return res.status(401).json({
            message:"Unauthorized"
        })
    }
}