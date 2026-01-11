import jwt from "jsonwebtoken";
import Book from "../models/book.js";
import Comment from "../models/Comments.js";
import { recomputeBookRating } from "../utils/recomputeBookRating.js";
import axios from "axios";

export const adminLogin = async(req, res) => {
    try {
        const {email, password} = req.body;

        if(email != process.env.ADMIN_EMAIL || password != process.env.ADMIN_PASSWORD){
            return res.json({sucess: false, message: "Invalid Credentials"})
        }

        const token = jwt.sign({email}, process.env.JWT_SECRET);
        res.json({success: true, token});
    } catch (error) {
        res.json({success: false, message: error.message});
    }   
}

export const getAllBookAdmin = async(req,res) => {
    try {
        const books = await Book.find({}).sort({createdAt: -1});
        res.json({success: true, books});
    
    } catch (error) {
        res.json({success: false, message: error.message});
    }
}

export const getAllComments = async(req,res) => {
    try {
        const comments = await Comment.find({}).populate("book").sort({createdAt: -1});
        res.json({success: true, comments});
    } catch (error) {
        res.json({success: false, message: error.message});
    }
}

export const getDashBoard = async(req,res) => {
    try {
        const recentBooks = await Book.find({}).sort({ createdAt: -1 }).limit(5);
        const books = await Book.countDocuments();
        const comments = await Comment.countDocuments();
        const drafts = await Book.countDocuments({isPublished: false})

        const dashboardData = {
            recentBooks,
            books,
            comments,
            drafts
        };
        res.json({success: true, dashboardData})
    } catch (error) {
        res.json({success: false, message: error.message});
    }
}

export const deleteCommentById = async(req, res) => {
    try {
        const {id} = req.body;
        await Comment.findByIdAndDelete(id);
        res.json({success: true, message: "Comment deleted successfully"})
    } catch (error) {
        res.json({success: false, message: error.message});
    }
}


export const approveCommentById = async (req, res) => {
  try {
    const { id } = req.body;

    let comment = await Comment.findById(id);
    if (!comment) {
      return res.status(404).json({ success: false, message: "Comment not found" });
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

    // 🔥 Update rating
    await recomputeBookRating(comment.book);

    res.json({
      success: true,
      message: "Comment approved & rating updated"
    });
  } catch (error) {
    console.error("approveCommentById:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

