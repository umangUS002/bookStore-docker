import express from "express";
import { adminLogin, approveCommentById, deleteCommentById, getAllBookAdmin, getAllComments, getDashBoard } from "../controllers/adminControllers.js";
import auth from "../middleware/auth.js"

const adminRouter = express.Router();

adminRouter.post("/login", adminLogin);
adminRouter.get("/comments", auth, getAllComments);
adminRouter.get("/books", getAllBookAdmin);
adminRouter.post("/delete-comment", auth, deleteCommentById);
adminRouter.post("/approve-comment", auth, approveCommentById);
adminRouter.get("/dashboard", auth, getDashBoard);

export default adminRouter;