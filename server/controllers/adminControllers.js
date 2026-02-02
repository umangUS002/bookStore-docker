import jwt from "jsonwebtoken";
import Book from "../models/book.js";
import Comment from "../models/Comments.js";
import { recomputeBookRating } from "../utils/recomputeBookRating.js";
import axios from "axios";
import redisClient from "../configs/redis.js";

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
        const CACHE_KEY = "admin:books:all";
        const cachedBooks = await redisClient.get(CACHE_KEY);
        if(cachedBooks){
            console.log("Admin books served from Redis");
            return res.status(200).json(JSON.parse(cachedBooks));
        }

        const books = await Book.find({}).sort({createdAt: -1});

        await redisClient.setEx(
            CACHE_KEY,
            300, // 5 min
            JSON.stringify({ success: true, books })
        );

        console.log("Admin books served from MongoDB");

        res.json({success: true, books});
    
    } catch (error) {
        res.json({success: false, message: error.message});
    }
}

export const getAllComments = async(req,res) => {
    try {
        const CACHE_KEY = "admin:comments:all"
        const cachedComments = await redisClient.get(CACHE_KEY);
        if(cachedComments){
            console.log("Admin comments served from Redis");
            return res.status(200).json(JSON.parse(cachedComments));
        }

        const comments = await Comment.find({}).populate("book").sort({createdAt: -1});

        await redisClient.setEx(
            CACHE_KEY,
            300,
            JSON.stringify({ success: true, comments })
        );

        console.log("Admin comments served from MongoDB");

        res.json({success: true, comments});
    } catch (error) {
        res.json({success: false, message: error.message});
    }
}

export const getDashBoard = async(req,res) => {
    try {
        const CACHE_KEY = "admin:dashboard";

        const cachedDashboard = await redisClient.get(CACHE_KEY);
        if (cachedDashboard) {
            console.log("Dashboard served from Redis");
            return res.status(200).json(JSON.parse(cachedDashboard));
        }

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

        await redisClient.setEx(
            CACHE_KEY,
            120, // shorter TTL (dashboard changes often)
            JSON.stringify({ success: true, dashboardData })
        );

        console.log("Dashboard served from MongoDB");

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

        await redisClient.del("admin:comments:all");
        await redisClient.del("admin:dashboard");

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

    await redisClient.del("admin:comments:all");
    await redisClient.del("admin:dashboard");

  } catch (error) {
    console.error("approveCommentById:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

