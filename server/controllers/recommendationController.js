import axios from "axios";
import Book from "../models/book.js";

/**
 * GET /api/recommendations
 * proxies to recommender service; falls back to simple content-based fallback
 */
export async function getRecommendationsForUser(req, res) {
  try {
    const userId = req.auth();
    if (process.env.REC_URL) {
      try {
        const resp = await axios.get(`${process.env.REC_URL}/recommendations/${userId}`);
        return res.json(resp.data);
      } catch (err) {
        console.warn("recommender service failed:", err.message);
      }
    }

    // fallback: return latest/popular books from DB
    const fallback = await Book.find().sort({ createdAt: -1 }).limit(12);
    return res.json(fallback);
  } catch (err) {
    console.error("getRecommendationsForUser err:", err);
    return res.status(500).json({ message: "Server error" });
  }
}

/**
 * GET /api/recommendations/book/:bookId
 * proxies to recommender service for similar books; fallback to DB query by genre
 */
export async function getSimilarBooks(req, res) {
  try {
    const { bookId } = req.params;
    if (process.env.REC_URL) {
      try {
        const resp = await axios.get(`${process.env.REC_URL}/similar/${bookId}`);
        return res.json(resp.data);
      } catch (err) {
        console.warn("recommender service failed:", err.message);
      }
    }

    // fallback: find the book and return other books that share a genre
    const book = await Book.findById(bookId);
    if (!book) return res.status(404).json({ message: "Book not found" });

    const similar = await Book.find({ _id: { $ne: book._id }, genres: { $in: book.genres || [] } }).limit(10);
    return res.json(similar);
  } catch (err) {
    console.error("getSimilarBooks err:", err);
    return res.status(500).json({ message: "Server error" });
  }
}
