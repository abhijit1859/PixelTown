import express, { type Request, type Response } from "express";
import "dotenv/config";
import cors from "cors";
import { createServer, Server as HttpServer } from 'http';
import { socketService } from "./services/socket.js";
import { connectDb } from "./config/db.config.js";
import authRoutes from "./routes/auth.routes.js"
 
const app = express();
const PORT = process.env.PORT || 5000;

app.use(
  cors({
    origin: process.env.CLIENT_URL || "*",
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/health", (req: Request, res: Response) => {
  res.status(200).json({
    status: "OK",
    uptime: process.uptime(),
  });
});


app.use("/api/v1",authRoutes)


const httpServer:HttpServer=createServer(app)
socketService.init(httpServer)

connectDb()

httpServer.listen(PORT,()=>{
    console.log("Server is up and running")
})