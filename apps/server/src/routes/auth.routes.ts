import express from "express"
import { getProfile, loginHandler, refreshSessionHandler, register } from "../controllers/auth.controller.js"
import { requireAuth } from "../middlewares/authMiddleware.js"

const router=express.Router()


router.post("/register",register)
router.post("/login",loginHandler)
router.post("/refresh",refreshSessionHandler)
router.get("/profile",requireAuth,getProfile)


export default router