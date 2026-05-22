import mongoose, { Schema, type Document } from "mongoose";
import bcrypt from "bcryptjs"
export interface IUser extends Document{
    username:string;
    email:string;
    passwordHash:string;
    lastPosition:{
        x:number;
        y:number;
        roomId:string;
        direction:'up'|'down'|'left'|'right'
    },
    createdAt:Date;
    comparePassword(password:string):Promise<boolean>;
}

const userSchema=new Schema<IUser>({
    username:{
        type:String,
        required:true,
        trim:true,
        unique:true,
        minLength:3
    },
    email:{
        required:true,
        unique:true,
        type:String,
        lowercase:true,
        trim:true
    },
    passwordHash:{
        type:String,
        required:true
    },
    lastPosition:{
        x:{type:Number,default:0},
        y:{type:Number,default:0},
        roomId:{type:String,default:""},
        direction:{
            type:String,
            enum:['up','down','left','right']
        },
        createdAt:{
            type:Date,
            default:Date.now
        }

    }
})


userSchema.pre<IUser>('save',async function(){
    if(!this.isModified('passwordHash')) return 

    try {
        const salt=await bcrypt.genSalt(10);
        this.passwordHash=await bcrypt.hash(this.passwordHash,salt)
        
    } catch (error) {
        throw new Error("Password encryption failed")
    }
})


userSchema.methods.comparePassword=async function(password:string):Promise<boolean>{
    try {
        return await bcrypt.compare(password,this.passwordHash);
    } catch (error) {
        console.error("error")
        return false;
    }
}

export const User=mongoose.model<IUser>('User',userSchema)


