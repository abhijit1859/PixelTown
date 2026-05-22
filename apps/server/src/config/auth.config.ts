
import jwt from "jsonwebtoken"

export interface UserPayload {
    id: string;
    username: string
}

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET!
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET!


export const generatetoken = (payload: UserPayload):{accessToken:string,refreshToken:string} => {
    const accessToken = jwt.sign({
        id: payload.id,
        username: payload.username
    }, ACCESS_TOKEN_SECRET, {
        expiresIn: '15m'
    })

    const refreshToken = jwt.sign({
        id: payload.id,
        username:payload.username
    },

        REFRESH_TOKEN_SECRET, {

        expiresIn: '7d'
    })

     return {
    accessToken,
    refreshToken,
  };
}

export const verifyAcessToken = (token: string): UserPayload => {
    return jwt.verify(token, ACCESS_TOKEN_SECRET) as UserPayload
}

export const verifyRefreshToken = (token: string): UserPayload => {
    return jwt.verify(token, REFRESH_TOKEN_SECRET) as UserPayload
}