import { generatetoken, verifyRefreshToken } from "../config/auth.config.js";
import { User, type IUser } from "../models/user.model.js";

interface AuthSessionResponse{
    accessToken:string,
    refreshToken:String;
    user:{
        id:any,
        username:string,
        email:string,
        lastPosition:IUser['lastPosition']
    }
}


class UserService{
    
    public async registerUer(username:string,email:string,passwordHash:String):Promise<AuthSessionResponse|null>{
        const existingUser=await User.findOne({
            $or:[{email},{username}]
        })

        if(existingUser) return null;

        const newUser=new User({username,email,passwordHash})

        await newUser.save()

        const token=await generatetoken({id:newUser._id.toString() as string,username:newUser.username as string})

        return {
            accessToken:token.accessToken,
            refreshToken:token.refreshToken,
            user:{
                id:newUser._id,
                username:newUser.username,
                email:newUser.email,
                lastPosition:newUser.lastPosition
            }
        }

    }

    public async loginUser(email:string,passwordHash:string):Promise<AuthSessionResponse|null>{
        const user=await User.findOne({email})
        if(!user) return null
        

        const isMatch=await user.comparePassword(passwordHash);
        if(!isMatch) return null;

        const tokens=generatetoken({id:user._id.toString(),username:user.username as string})

        return {
            accessToken:tokens.accessToken,
            refreshToken:tokens.refreshToken,
            user:{
                id:user._id,
                username:user.username,
                email:user.email,
                lastPosition:user.lastPosition
            }
        }
    }

    public async refreshUserSession(token:string):Promise<{accessToken:string;refreshToken:string}|null>{
        try {
            const decoded=verifyRefreshToken(token)
            const user=await User.findById(decoded.id)
            if(!user) return null
            return generatetoken({id:user._id.toString(),username:user.username}) 
        } catch (error) {
            console.error(error)
            return null
        }
    }


    public async getProfile(userId:string){
        const user=await User.findById(userId).select("-hashPassword")
        if(!user){
            return null
        }
        return user
    }
}

export const userService=new UserService()