import mongoose from "mongoose";

const commentSchema = new mongoose.Schema({
    book: { type: mongoose.Schema.Types.ObjectId, ref: 'Book', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    name: { type: String, required: true },
    content: { type: String, required: true },
    sentiment: { score: Number, label: String },
    moderated: { type: Boolean, default: false },
    isApproved: { type: Boolean, default: false },
}, { timestamps: true });

const Comment = mongoose.model('Comment', commentSchema);

export default Comment;