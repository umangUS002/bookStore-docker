import Wishlist from "../models/Wishlist.js";
import Interaction from "../models/Interaction.js";
/**
 * GET /api/wishlist
 * return user's wishlist (populated with book)
 */
export async function getWishlist(req, res) {
  try {
    const { userId } = req.auth();
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const list = await Wishlist
      .find({ userId })
      .populate("bookId");

    return res.json(list);
  } catch (err) {
    console.error("getWishlist err:", err);
    return res.status(500).json({ message: "Server error" });
  }
}


/**
 * POST /api/wishlist  { bookId }
 * add entry (idempotent)
 */
export async function addToWishlist(req, res) {
  try {
    const { userId } = req.auth();
    const { bookId } = req.body;
    if (!bookId) return res.status(400).json({ message: "Missing bookId" });

    const entry = await Wishlist.findOneAndUpdate(
      { userId, bookId },
      { $setOnInsert: { userId, bookId } },
      { upsert: true, new: true }
    );

    // log interaction for recommender signals
    await Interaction.create({ userId, bookId, type: "add_to_wishlist" });

    return res.status(201).json({ ok: true, entry });
  } catch (err) {
    if (err.code === 11000) return res.json({ ok: true });
    console.error("addToWishlist err:", err);
    return res.status(500).json({ message: "Server error" });
  }
}

/**
 * DELETE /api/wishlist/:bookId
 */
export async function removeFromWishlist(req, res) {
  try {
    const { userId } = req.auth();
    const { bookId } = req.params;
    await Wishlist.deleteOne({ userId, bookId });
    return res.json({ ok: true });
  } catch (err) {
    console.error("removeFromWishlist err:", err);
    return res.status(500).json({ message: "Server error" });
  }
}
