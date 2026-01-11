import mongoose from "mongoose";

const bookSchema = new mongoose.Schema({
    title: {type: String, required: true},
    author: {type: String, required: true},
    description: {type: String, required: true},
    genre: {type: String, required: true},
    isbn: {type: String, required: true},
    publisher: {type: String, required: true},
    language: {type: String, required: true},
    pages: {type: Number},
    image: {type: String, required: true},
    rating: {type: Number, min: 0, max: 5, default: null},
    tags: [String],
    publishedDate: {type: Date, required: true},
    isPublished: {type: Boolean, required: true},
}, {timestamps: true});

const Book = mongoose.models.Book || mongoose.model("Book", bookSchema)

export default Book;