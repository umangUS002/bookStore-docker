import mongoose from "mongoose";

const wishlistSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    bookId: { type: mongoose.Schema.Types.ObjectId, ref: 'Book', required: true },
    createdAt: { type: Date, default: Date.now }
})

wishlistSchema.index({ userId: 1, bookId: 1 }, { unique: true });

const Wishlist = mongoose.model('Wishlist', wishlistSchema);
export default Wishlist;