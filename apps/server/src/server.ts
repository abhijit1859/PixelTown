import express, { type Request, type Response } from "express";
import "dotenv/config";
import cors from "cors";
import cookieParser from "cookie-parser";
import { createServer, Server as HttpServer } from 'http';
import { socketService } from "./services/socket.js";
import { connectDb } from "./config/db.config.js";
import authRoutes from "./routes/auth.routes.js"
 
const app = express();
const PORT = process.env.PORT || 5000;

const allowedOrigins = [
  'http://localhost:3000', // Common React web port
  'http://localhost:5173', // Common Vite web port
  'http://192.168.0.106:3000' // Your local IP for mobile/testing
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl)
      if (!origin) return callback(null, true);
      
      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser())


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