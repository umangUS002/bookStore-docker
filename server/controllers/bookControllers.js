import fs from "fs";
import imagekit from "../configs/imageKit.js";
import Book from "../models/book.js";
import Comment from "../models/Comments.js";
import main from "../configs/gemini.js";
import Subscriber from "../models/Subscriber.js";
import { sendNewBookEmail } from "../utils/sendEmail.js";
import redisClient from "../configs/redis.js";
import axios from "axios";
import { log } from "console";
import Interaction from "../models/Interaction.js";
import esClient, { indexBook, deleteBookFromIndex } from "../configs/elasticsearch.js";

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

        const bookC = await Book.create({ image, title, author, description, genre, publishedDate, isbn, publisher, pages, language, rating, manualRating: rating, tags, isPublished })

        // Sync to Elasticsearch
        await indexBook(bookC);

        // Fetch all subscribers
        const subscribers = await Subscriber.find({});
        const emails = subscribers.map(s => s.email);

        if (emails.length > 0) {
            await sendNewBookEmail(emails, bookC);
        }

        res.json({ success: true, message: "Book added successfully" })

        try {
            await redisClient.del("books:all");
            await redisClient.del("admin:books:all");
        } catch (err) {
            console.warn("Redis del error in addBook:", err.message);
        }

    } catch (error) {
        res.json({ success: false, message: error.message })
    }
}

export const getAllBooks = async (req, res) => {
    try {
        const CACHE_KEY = "books:all";

        let cachedBooks = null;
        try {
            cachedBooks = await redisClient.get(CACHE_KEY);
        } catch (err) {
            console.warn("Redis get error in getAllBooks:", err.message);
        }
        if(cachedBooks){
            console.log("Books served from Redis");
            return res.status(200).json(JSON.parse(cachedBooks));
        }

        const books = await Book.find({ isPublished: true }).sort({ createdAt: -1 })

        const response = {
            success: true,
            books
        };

        try {
            await redisClient.setEx(
                CACHE_KEY,
                300,
                JSON.stringify(response)
            );
        } catch (err) {
            console.warn("Redis setEx error in getAllBooks:", err.message);
        }

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
            return res.json({ success: false, message: "Book not found" });
        }

        // Log view interaction for recommender signals if user is logged in
        try {
            const { userId } = req.auth();
            if (userId) {
                await Interaction.create({
                    userId,
                    bookId: book._id,
                    type: "view"
                });
            }
        } catch (err) {
            console.error("Failed to log view interaction:", err.message);
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

        // Delete from Elasticsearch
        await deleteBookFromIndex(id);

        // Delete all comments associated with the book
        await Comment.deleteMany({ book: id });

        res.json({ success: true, message: "Book deleted successfully" })

        try {
            await redisClient.del("books:all");
            await redisClient.del("admin:books:all");
        } catch (err) {
            console.warn("Redis del error in deleteBookById:", err.message);
        }

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

        try {
            await redisClient.del("books:all");
            await redisClient.del("admin:books:all");
        } catch (err) {
            console.warn("Redis del error in togglePublish:", err.message);
        }
        
    } catch (error) {
        res.json({ success: false, message: error.message })
    }
}

export const addComment = async (req, res) => {
    try {
        const { book, name, content } = req.body;
        const commentData = { book, name, content };

        try {
            const { userId } = req.auth();
            if (userId) {
                commentData.userId = userId;
            }
        } catch (err) {
            console.error("Failed to extract userId for comment:", err.message);
        }

        if (process.env.SENTIMENT_URL) {
            try {
                const resp = await axios.post(
                    `${process.env.SENTIMENT_URL}/analyze/comment`,
                    { text: content }
                );

                if (resp.data?.sentiment) {
                    commentData.sentiment = resp.data.sentiment;
                }
            } catch (err) {
                console.warn("sentiment service failed:", err.message);
            }
        }

        const comment = await Comment.create(commentData);
        res.json({
            success: true,
            message: "Comment added for review",
            sentiment: comment.sentiment
        })

        try {
            await redisClient.del("admin:comments:all");
            await redisClient.del("admin:dashboard");
        } catch (err) {
            console.warn("Redis del error in addComment:", err.message);
        }
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

export const searchBooks = async (req, res) => {
    try {
        const { q } = req.query;

        if (!q || !q.trim()) {
            // If query is empty, return all published books (default behavior)
            const books = await Book.find({ isPublished: true }).sort({ createdAt: -1 });
            return res.json({ success: true, books });
        }

        const queryStr = q.trim();

        // 1. Query Elasticsearch (exact + synonyms + fuzziness keyword match)
        let esBooks = [];
        try {
            if (process.env.ELASTICSEARCH_URL) {
                const esResult = await esClient.search({
                    index: "books",
                    body: {
                        query: {
                            multi_match: {
                                query: queryStr,
                                fields: ["title^3", "author^2", "description", "tags^2"],
                                fuzziness: "AUTO"
                            }
                        }
                    }
                });
                if (esResult.hits && esResult.hits.hits) {
                    esBooks = esResult.hits.hits.map(hit => ({
                        id: hit._source.id,
                        score: hit._score
                    }));
                }
            }
        } catch (err) {
            console.error("Elasticsearch search failed:", err.message);
        }

        // 2. Query Python Service (SpaCy Lemmatization, regex, and RapidFuzz typo ratio)
        let nlpBooks = [];
        if (process.env.REC_URL) {
            try {
                const resp = await axios.post(`${process.env.REC_URL}/search/nlp`, { query: queryStr }, { timeout: 3000 });
                if (Array.isArray(resp.data)) {
                    nlpBooks = resp.data;
                }
            } catch (err) {
                console.error("NLP search service failed:", err.message);
            }
        }

        // 3. Hybrid Ranking Merger
        const scoreMap = {};

        // Add Elasticsearch scores (weighted)
        for (const item of esBooks) {
            scoreMap[item.id] = (scoreMap[item.id] || 0) + item.score * 1.5;
        }

        // Add NLP & Fuzzy scores from Python service
        for (const item of nlpBooks) {
            // Combine SpaCy TF-IDF score with RapidFuzz ratio score (max 100, normalized to 0..1)
            const combinedNlp = (item.score * 1.0) + (item.fuzzy_score / 100.0) * 2.5;
            scoreMap[item.id] = (scoreMap[item.id] || 0) + combinedNlp;
        }

        // Sort by combined score descending
        const sortedIds = Object.keys(scoreMap).sort((a, b) => scoreMap[b] - scoreMap[a]);

        if (sortedIds.length > 0) {
            // Fetch matched books from MongoDB
            const matchedBooks = await Book.find({
                _id: { $in: sortedIds },
                isPublished: true
            });

            // Maintain the sorted order from the hybrid scorer
            const booksMap = matchedBooks.reduce((map, b) => {
                map[b._id.toString()] = b;
                return map;
            }, {});

            const sortedBooks = sortedIds
                .map(id => booksMap[id])
                .filter(b => b !== undefined);

            return res.json({ success: true, books: sortedBooks });
        }

        // Fallback: local MongoDB regex search if both external search providers returned nothing/failed
        console.log("Falling back to local MongoDB search for:", queryStr);
        const words = queryStr.split(/\s+/).filter(Boolean);
        const orConditions = [];
        
        words.forEach(word => {
            const regex = new RegExp(word, "i");
            orConditions.push({ title: regex });
            orConditions.push({ author: regex });
            orConditions.push({ genre: regex });
            orConditions.push({ tags: regex });
        });

        if (orConditions.length === 0) {
            return res.json({ success: true, books: [] });
        }

        const fallbackBooks = await Book.find({
            isPublished: true,
            $or: orConditions
        });

        res.json({ success: true, books: fallbackBooks });

    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};
