import type { Request, Response } from "express";
import { userService } from "../services/auth.services.js";

export const register = async (req: Request, res: Response) => {
    try {
        const { username, email, password } = req.body;
        if (!username || !email || !password) {
            return res.status(400).json({
                message: "all fields are required"
            })
        }

        const sessionData = await userService.registerUer(username, email, password)

        if (!sessionData) {
            return res.status(400).json({
                message: "Unique fields required"
            })
        }

        res.cookie('refreshToken', sessionData.refreshToken, {
            httpOnly: true,
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000
        })

        return res.status(201).json({
            message: "user registered successfully",
            accessToken: sessionData.accessToken,
            user: sessionData.user,
        })

    } catch (error) {
        console.error(error)
        return res.status(500).json({
            message: "internal server.error"
        })
    }

}

export const loginHandler = async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({
                message: "all fields are required"
            })
        }
        const sessionData = await userService.loginUser(email, password)

        if (!sessionData) {
            return res.status(401).json({
                message: "Enter valid details"
            })
        }

        res.cookie('refreshToken', sessionData.refreshToken, {
            httpOnly: true,
            sameSite: "strict",
            maxAge: 7 * 24 * 60 * 60 * 1000
        })

        return res.status(200).json({
            message: "Logged in",
            accessToken: sessionData.accessToken,
            user: sessionData.user
        })
    } catch (error) {
        console.error(error)
        return res.status(500).json({
            message: "internal server error"
        })
    }
}

export const refreshSessionHandler = async (req: Request, res: Response) => {
    try {
        const refreshToken = req.cookies?.refreshToken

        if (!refreshToken) {
            return res.status(401).json({
                message: "Refresh token missing"
            })
        }

        const newTokens = await userService.refreshUserSession(refreshToken)

        if (!newTokens) {
            return res.status(403).json({
                message: "invalid details"
            })
        }

        res.cookie('refreshToken', newTokens.refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        return res.status(200).json({ accessToken: newTokens.accessToken });
    } catch (error) {
        console.error(error)
        return res.status(403).json({ message: 'Invalid or expired refresh token' });
    }
}

export const getProfile=async(req:Request,res:Response)=>{
    try {
        const userId=req.user?.id;
        if(!userId){
            return res.send(401).json({
                message:"authorization error"
            })
        }
        const sessionData=await userService.getProfile(userId)
        if(!sessionData){
            return res.status(401).json({
                message:"authorization error"
            })
        }
        return res.status(201).json({
            user: {
                id: sessionData._id,
                username: sessionData.username,
                email: sessionData.email,
                lastPosition: sessionData.lastPosition
            }
        })
    } catch (error) {
        console.log(error)
        return res.status(501).json({
            message:"internal server error"
        })
    }
}