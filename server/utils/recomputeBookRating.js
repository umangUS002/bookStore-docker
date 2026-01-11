import Comment from "../models/Comments.js";
import Book from "../models/book.js";
import mongoose from "mongoose";

export async function recomputeBookRating(bookId) {
  const comments = await Comment.find({
    book: new mongoose.Types.ObjectId(bookId),
    isApproved: true,
    "sentiment.score": { $exists: true }
  });

  if (!comments.length) {
    await Book.findByIdAndUpdate(bookId, {
      rating: null
    });
    return;
  }

  const scores = comments.map(c => c.sentiment.score);
  const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;

  const stars = Number(
    (((avgScore + 1) / 2) * 4 + 1).toFixed(1)
  );

  await Book.findByIdAndUpdate(bookId, {
    rating: stars
  });
}

