import express from "express";
import { getWishlist, addToWishlist, removeFromWishlist } from "../controllers/wishlistController.js";

const wishlistRouter = express.Router();

wishlistRouter.get("/", getWishlist);
wishlistRouter.post("/", addToWishlist);
wishlistRouter.delete("/:bookId", removeFromWishlist);

export default wishlistRouter;
