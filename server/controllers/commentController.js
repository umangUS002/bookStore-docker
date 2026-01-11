import Comment from "../models/Comment.js";
import axios from "axios";
import { recomputeBookRating } from "../utils/recomputeBookRating.js";
/**
 * POST /api/books/:bookId/comments
 * creates a comment and calls sentiment service (if configured)
 */

export const approveCommentById = async (req, res) => {
  try {
    const { id } = req.body;

    let comment = await Comment.findById(id);
    if (!comment) {
      return res.status(404).json({
        success: false,
        message: "Comment not found"
      });
    }

    // 🔥 Ensure sentiment exists
    if (!comment.sentiment || comment.sentiment.score === undefined) {
      const resp = await axios.post(
        `${process.env.SENTIMENT_URL}/analyze/comment`,
        { text: comment.content }
      );
      comment.sentiment = resp.data.sentiment;
    }

    comment.isApproved = true;
    await comment.save();

    // 🔥 Recompute book rating
    await recomputeBookRating(comment.book);

    res.json({
      success: true,
      message: "Comment approved & rating updated"
    });

  } catch (error) {
    console.error("approveCommentById:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};


/**
 * GET /api/books/:bookId/comments
 */
export async function getCommentsForBook(req, res) {
  try {
    const { bookId } = req.params;
    const comments = await Comment.find({ bookId }).populate("userId", "name");
    return res.json(comments);
  } catch (err) {
    console.error("getCommentsForBook err:", err);
    return res.status(500).json({ message: "Server error" });
  }
}
