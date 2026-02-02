import fs from "fs";
import imagekit from "../configs/imageKit.js";
import Book from "../models/book.js";
import Comment from "../models/Comments.js";
import main from "../configs/gemini.js";
import Subscriber from "../models/Subscriber.js";
import { sendNewBookEmail } from "../utils/sendEmail.js";
import redisClient from "../configs/redis.js";
import { log } from "console";

export const addBook = async (req, res) => {
    try {
        const { title, author, description, genre, publishedDate, isbn, publisher, pages, language, rating, tags, isPublished } = JSON.parse(req.body.book);
        const imageFile = req.file;

        //Check if all fields are present
        if (!title || !author || !genre || !publishedDate || !isbn || !publisher || !language || !description || !imageFile) {
            return res.json({ success: false, message: "Missing required fields." })
        }

        const fileBuffer = fs.readFileSync(imageFile.path)

        // Upload image to imageKit
        const response = await imagekit.upload({
            file: fileBuffer,
            fileName: imageFile.originalname,
            folder: "/bookStack"
        })

        // Optimization through imageKit URL transformation
        const optimizedImageUrl = imagekit.url({
            path: response.filePath,
            transformation: [
                { quality: 'auto' },  // Auto compression
                { format: 'webp' },   // Convert to modern format
                { width: '1280' }      // Width resizing
            ]
        })

        const image = optimizedImageUrl;

        const bookC = await Book.create({ image, title, author, description, genre, publishedDate, isbn, publisher, pages, language, rating, tags, isPublished })

        // Fetch all subscribers
        const subscribers = await Subscriber.find({});
        const emails = subscribers.map(s => s.email);

        if (emails.length > 0) {
            await sendNewBookEmail(emails, bookC);
        }

        res.json({ success: true, message: "Book added successfully" })

        await redisClient.del("books:all");
        await redisClient.del("admin:books:all");

    } catch (error) {
        res.json({ success: false, message: error.message })
    }
}

export const getAllBooks = async (req, res) => {
    try {
        const CACHE_KEY = "books:all";

        const cachedBooks = await redisClient.get(CACHE_KEY);
        if(cachedBooks){
            console.log("Books served from Redis");
            return res.status(200).json(JSON.parse(cachedBooks));
        }

        const books = await Book.find({ isPublished: true }).sort({ createdAt: -1 })

        const response = {
            success: true,
            books
        };

        await redisClient.setEx(
            CACHE_KEY,
            300,
            JSON.stringify(response)
        );

        console.log("Books served from MongoDB");

        res.status(200).json(response);
    } catch (error) {
        res.json({ success: false, message: error.message })
    }
}

export const getBookById = async (req, res) => {
    try {
        const { bookId } = req.params;
        const book = await Book.findById(bookId)
        if (!book) {
            res.json({ success: false, message: "Book not found" });
        }
        res.json({ success: true, book })
    } catch (error) {
        res.json({ success: false, message: error.message })
    }
}

export const deleteBookById = async (req, res) => {
    try {
        const { id } = req.body;
        await Book.findByIdAndDelete(id);

        // Delete all comments associated with the book
        await Comment.deleteMany({ book: id });

        res.json({ success: true, message: "Book deleted successfully" })

        await redisClient.del("books:all");
        await redisClient.del("admin:books:all");

    } catch (error) {
        res.json({ success: false, message: error.message })
    }
}

export const togglePublish = async (req, res) => {
    try {
        const { id } = req.body;
        const book = await Book.findById(id);
        book.isPublished = !book.isPublished;
        await book.save();
        res.json({ success: true, message: "Book status updated" })

        await redisClient.del("books:all");
        await redisClient.del("admin:books:all");
        
    } catch (error) {
        res.json({ success: false, message: error.message })
    }
}

export const addComment = async (req, res) => {
    try {
        const { book, name, content } = req.body;
        await Comment.create({ book, name, content });
        res.json({ success: true, message: "Comment added for review" })
    } catch (error) {
        res.json({ success: false, message: error.message })
    }
}

export const getBookComment = async (req, res) => {
    try {
        const { bookId } = req.body;

        // const CACHE_KEY = `comments:book:${bookId}`;
        // const cachedComments = await redisClient.get(CACHE_KEY);
        // if (cachedComments) {
        //     console.log("Comments served from Redis");
        //     return res.status(200).json({
        //         success: true,
        //         comments: JSON.parse(cachedComments)
        //     });
        // }

        const comments = await Comment.find({ book: bookId, isApproved: true }).sort({ createdAt: -1 });
        
        // await redisClient.setEx(
        //     CACHE_KEY,
        //     300,
        //     JSON.stringify(comments)
        // );
        // console.log("Comments served from MongoDB");

        res.json({ success: true, comments })
    } catch (error) {
        res.json({ success: false, message: error.message })
    }
}

export const generateContent = async (req, res) => {
    try {
        const { prompt } = req.body;
        const content = await main(prompt + 'Generate a 120-130 words description for this book in simple text format without showing any prompts, to use directly.');
        res.json({ success: true, content });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
}

export const getSimilarBooks = async (req, res) => {
    try {
        const { id: bookId } = req.params;

        // Find the current book by ID
        const currentBook = await Book.findById(bookId);
        if (!currentBook) {
            return res.json({ success: false, message: "Book not found" });
        }

        // Find similar books by matching genre or overlapping tags
        const similarBooks = await Book.find({
            _id: { $ne: bookId }, // Exclude the current book
            isPublished: true,
            $or: [
                { genre: currentBook.genre },
                { tags: { $in: currentBook.tags } }
            ]
        }).limit(5); // optional limit

        res.json({ success: true, similarBooks });

    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};