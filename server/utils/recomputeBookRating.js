import Comment from "../models/Comments.js";
import Book from "../models/book.js";
import mongoose from "mongoose";

export async function recomputeBookRating(bookId) {
  const comments = await Comment.find({
    book: new mongoose.Types.ObjectId(bookId),
    isApproved: true,
    "sentiment.score": { $exists: true }
  });

  const book = await Book.findById(bookId);
  if (!book) return null;

  // Use manualRating if set, otherwise fallback to current rating (or null)
  const manualRating = book.manualRating !== undefined && book.manualRating !== null
    ? book.manualRating
    : book.rating;

  const N = comments.length;
  let finalRating = null;

  if (N === 0) {
    // If no comments, the rating is exactly the manual rating
    finalRating = manualRating;
  } else {
    // Convert sentiment score (-1 to 1) to star rating (1 to 5)
    // star_rating = ((sentiment + 1) / 2) * 4 + 1
    const commentsStarSum = comments.reduce((sum, c) => {
      const score = c.sentiment.score;
      const stars = ((score + 1) / 2) * 4 + 1;
      return sum + stars;
    }, 0);

    if (manualRating !== null && manualRating !== undefined) {
      const W_m = 5; // Weight of the manual rating
      finalRating = (W_m * manualRating + commentsStarSum) / (W_m + N);
    } else {
      finalRating = commentsStarSum / N;
    }

    finalRating = Number(finalRating.toFixed(1));
  }

  book.rating = finalRating;
  await book.save();

  return finalRating;
}
