import express from "express";
import { signup, login, refreshToken, logout } from "../controllers/authController.js";

const authRouter = express.Router();

authRouter.post("/signup", signup);
authRouter.post("/login", login);
authRouter.post("/refresh", refreshToken);
authRouter.post("/logout", logout);

export default authRouter;
