import express from "express";
import { addBook, addComment, deleteBookById, generateContent, getAllBooks, getBookById, getBookComment, getSimilarBooks, togglePublish } from "../controllers/bookControllers.js";
import upload from "../middleware/multer.js";
import auth from "../middleware/auth.js";
import Book from "../models/book.js";

const bookRouter = express.Router();

bookRouter.post("/add", upload.single('image'), auth, addBook);
bookRouter.get("/all", getAllBooks);
bookRouter.post("/delete", auth, deleteBookById);
bookRouter.post("/toggle-publish", togglePublish);
bookRouter.post("/add-comment", addComment);
bookRouter.post("/comments", getBookComment);

bookRouter.post("/by-ids", async (req, res) => {
  try {
    const { ids } = req.body;

    if (!ids || !ids.length) {
      return res.json([]);
    }

    const books = await Book.find({
      _id: { $in: ids }
    });

    res.json(books);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

bookRouter.get("/:bookId", getBookById);

bookRouter.post("/generate", auth, generateContent);
bookRouter.get("/similar-books/:id", getSimilarBooks);

export default bookRouter;