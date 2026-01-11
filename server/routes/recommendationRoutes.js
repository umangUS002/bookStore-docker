import express from "express";
import { getRecommendationsForUser, getSimilarBooks } from "../controllers/recommendationController.js";

const recRouter = express.Router();

recRouter.get("/", getRecommendationsForUser);
recRouter.get("/book/:bookId", getSimilarBooks);

export default recRouter;
