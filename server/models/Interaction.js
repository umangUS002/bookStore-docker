import mongoose from "mongoose";

const interactionSchema = new mongoose.Schema({
    userId: { type: String, required: true, index: true },
    bookId: { type: mongoose.Schema.Types.ObjectId, ref: 'Book' },
    type: { type: String, enum: ['view', 'click', 'add_to_wishlist', 'like', 'rating'] },
    value: Number,
    createdAt: { type: Date, default: Date.now }
})

const Interaction = mongoose.model('Interaction', interactionSchema);
export default Interaction;