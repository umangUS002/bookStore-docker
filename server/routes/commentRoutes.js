import express from "express";
import { postComment, getCommentsForBook } from "../controllers/commentController.js";
import auth from "../middleware/auth.js";

const commentRouter = express.Router();

// POST /api/books/:bookId/comments
commentRouter.post("/:bookId/comments", auth, postComment);
// GET  /api/books/:bookId/comments
commentRouter.get("/:bookId/comments", getCommentsForBook);

export default commentRouter;
