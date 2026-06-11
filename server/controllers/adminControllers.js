import jwt from "jsonwebtoken";
import Book from "../models/book.js";
import Comment from "../models/Comments.js";
import { recomputeBookRating } from "../utils/recomputeBookRating.js";
import axios from "axios";
import redisClient from "../configs/redis.js";
import mongoose from "mongoose";
import Interaction from "../models/Interaction.js";
import esClient from "../configs/elasticsearch.js";

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
        let cachedBooks = null;
        try {
            cachedBooks = await redisClient.get(CACHE_KEY);
        } catch (err) {
            console.warn("Redis get error in getAllBookAdmin:", err.message);
        }
        if(cachedBooks){
            console.log("Admin books served from Redis");
            return res.status(200).json(JSON.parse(cachedBooks));
        }

        const books = await Book.find({}).sort({createdAt: -1});

        // Attach approvedCommentsCount to each book object
        const booksWithCommentCount = await Promise.all(books.map(async (book) => {
            const approvedCommentsCount = await Comment.countDocuments({
                book: book._id,
                isApproved: true
            });
            const bookObj = book.toObject();
            bookObj.approvedCommentsCount = approvedCommentsCount;
            return bookObj;
        }));

        try {
            await redisClient.setEx(
                CACHE_KEY,
                300, // 5 min
                JSON.stringify({ success: true, books: booksWithCommentCount })
            );
        } catch (err) {
            console.warn("Redis setEx error in getAllBookAdmin:", err.message);
        }

        console.log("Admin books served from MongoDB");

        res.json({success: true, books: booksWithCommentCount});
    
    } catch (error) {
        res.json({success: false, message: error.message});
    }
}

export const getAllComments = async(req,res) => {
    try {
        const CACHE_KEY = "admin:comments:all"
        let cachedComments = null;
        try {
            cachedComments = await redisClient.get(CACHE_KEY);
        } catch (err) {
            console.warn("Redis get error in getAllComments:", err.message);
        }
        if(cachedComments){
            console.log("Admin comments served from Redis");
            return res.status(200).json(JSON.parse(cachedComments));
        }

        const comments = await Comment.find({}).populate("book").sort({createdAt: -1});

        try {
            await redisClient.setEx(
                CACHE_KEY,
                300,
                JSON.stringify({ success: true, comments })
            );
        } catch (err) {
            console.warn("Redis setEx error in getAllComments:", err.message);
        }

        console.log("Admin comments served from MongoDB");

        res.json({success: true, comments});
    } catch (error) {
        res.json({success: false, message: error.message});
    }
}

export const getDashBoard = async(req,res) => {
    try {
        const CACHE_KEY = "admin:dashboard";

        let cachedDashboard = null;
        try {
            cachedDashboard = await redisClient.get(CACHE_KEY);
        } catch (err) {
            console.warn("Redis get error in getDashBoard:", err.message);
        }
        if (cachedDashboard) {
            console.log("Dashboard served from Redis");
            return res.status(200).json(JSON.parse(cachedDashboard));
        }

        const recentBooks = await Book.find({}).sort({ createdAt: -1 }).limit(5);
        
        // Attach approvedCommentsCount to each recent book object
        const recentBooksWithCommentCount = await Promise.all(recentBooks.map(async (book) => {
            const approvedCommentsCount = await Comment.countDocuments({
                book: book._id,
                isApproved: true
            });
            const bookObj = book.toObject();
            bookObj.approvedCommentsCount = approvedCommentsCount;
            return bookObj;
        }));

        const books = await Book.countDocuments();
        const comments = await Comment.countDocuments();
        const drafts = await Book.countDocuments({isPublished: false})

        const dashboardData = {
            recentBooks: recentBooksWithCommentCount,
            books,
            comments,
            drafts
        };

        try {
            await redisClient.setEx(
                CACHE_KEY,
                120, // shorter TTL (dashboard changes often)
                JSON.stringify({ success: true, dashboardData })
            );
        } catch (err) {
            console.warn("Redis setEx error in getDashBoard:", err.message);
        }

        console.log("Dashboard served from MongoDB");

        res.json({success: true, dashboardData})
    } catch (error) {
        res.json({success: false, message: error.message});
    }
}

export const deleteCommentById = async(req, res) => {
    try {
        const {id} = req.body;
        const deletedComment = await Comment.findByIdAndDelete(id);
        if (deletedComment) {
            if (deletedComment.book) {
                await recomputeBookRating(deletedComment.book);
            }
            if (deletedComment.userId) {
                await Interaction.deleteMany({
                    userId: deletedComment.userId,
                    bookId: deletedComment.book,
                    type: { $in: ["positive_comment", "negative_comment"] }
                });
            }
        }
        try {
            await redisClient.del("admin:comments:all");
            await redisClient.del("admin:dashboard");
            await redisClient.del("admin:books:all");
            await redisClient.del("books:all");
        } catch (err) {
            console.warn("Redis del error in deleteCommentById:", err.message);
        }

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

    // Log interaction for recommender signals if user is logged in
    if (comment.userId) {
      const sentimentLabel = comment.sentiment?.label; // "positive", "neutral", "negative"
      let interactionType = null;
      if (sentimentLabel === "positive") {
        interactionType = "positive_comment";
      } else if (sentimentLabel === "negative") {
        interactionType = "negative_comment";
      }

      if (interactionType) {
        try {
          await Interaction.findOneAndUpdate(
            { userId: comment.userId, bookId: comment.book, type: interactionType },
            { userId: comment.userId, bookId: comment.book, type: interactionType },
            { upsert: true }
          );
        } catch (err) {
          console.error("Failed to log comment interaction:", err.message);
        }
      }
    }

    // 🔥 Update rating
    const rating = await recomputeBookRating(comment.book);

    try {
      await redisClient.del("admin:comments:all");
      await redisClient.del("admin:dashboard");
      await redisClient.del("admin:books:all");
      await redisClient.del("books:all");
    } catch (err) {
      console.warn("Redis del error in approveCommentById:", err.message);
    }

    console.log(`Book ${comment.book} rating updated to ${rating}`);

    res.json({
      success: true,
      message: "Comment approved & rating updated",
      rating
    });

  } catch (error) {
    console.error("approveCommentById:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getServiceHealth = async (req, res) => {
    try {
        // 1. Redis check
        let redisStatus = "disconnected";
        try {
            if (redisClient && redisClient.isOpen) {
                await redisClient.ping();
                redisStatus = "connected";
            }
        } catch (err) {
            console.error("Redis health check failed:", err.message);
        }

        // 2. MongoDB check
        const mongoState = mongoose.connection.readyState;
        const mongoStatus = mongoState === 1 ? "connected" : "disconnected";

        // 3. Recommender check
        let recommenderStatus = "unhealthy";
        if (process.env.REC_URL) {
            try {
                const resp = await axios.get(`${process.env.REC_URL}/health`, { timeout: 2000 });
                if (resp.status === 200) {
                    recommenderStatus = "healthy";
                }
            } catch (err) {
                console.error("Recommender health check failed:", err.message);
            }
        }

        // 4. Sentiment check
        let sentimentStatus = "unhealthy";
        if (process.env.SENTIMENT_URL) {
            try {
                const resp = await axios.get(`${process.env.SENTIMENT_URL}/health`, { timeout: 2000 });
                if (resp.status === 200) {
                    sentimentStatus = "healthy";
                }
            } catch (err) {
                console.error("Sentiment health check failed:", err.message);
            }
        }

        // 5. Elasticsearch check
        let elasticsearchStatus = "disconnected";
        try {
            if (esClient) {
                const esHealth = await esClient.cluster.health({ timeout: "2s" });
                if (esHealth && esHealth.status) {
                    elasticsearchStatus = esHealth.status; // 'green', 'yellow', or 'red'
                }
            }
        } catch (err) {
            console.error("Elasticsearch health check failed:", err.message);
        }

        res.json({
            success: true,
            health: {
                redis: redisStatus,
                recommender: recommenderStatus,
                sentiment: sentimentStatus,
                mongo: mongoStatus,
                elasticsearch: elasticsearchStatus
            }
        });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

