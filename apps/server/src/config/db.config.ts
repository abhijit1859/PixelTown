import mongoose from "mongoose";


const mongouri=process.env.MONGO_URI;
console.log(mongouri)
export const connectDb=async ()=>{
    if(!mongouri){
        throw new Error("mongo uri missing")
    }
    mongoose.connection.on("connected",()=>{
        console.log("connected to db")
    })
    mongoose.connection.on("disconnected",()=>{
        console.log("disconnected")
    })
    mongoose.connection.on("error",()=>{
        console.log("error")
    })
    await mongoose.connect(mongouri)
}