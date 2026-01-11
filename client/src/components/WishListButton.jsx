import { useAuth } from "@clerk/clerk-react";
import { useState } from "react";
import { useAppContext } from "../context/AppContext";

export default function WishlistButton({ bookId }) {
  const { axios, wishlist, setWishlist } = useAppContext();
  const { getToken, isSignedIn } = useAuth();
  const [loading, setLoading] = useState(false);

  const added = wishlist?.includes(bookId);

  async function toggle(e) {
    e.preventDefault();
    e.stopPropagation();

    if (!isSignedIn) {
      alert("Login first");
      return;
    }

    if (loading) return;

    try {
      setLoading(true);

      const clerkToken = await getToken();

      const config = {
        headers: {
          Authorization: `Bearer ${clerkToken}`,
        },
      };

      if (!added) {
        await axios.post("/api/wishlist", { bookId }, config);
        setWishlist(prev => [...prev, bookId]);
      } else {
        await axios.delete(`/api/wishlist/${bookId}`, config);
        setWishlist(prev => prev.filter(id => id !== bookId));
      }
    } catch (err) {
      console.error("wishlist toggle failed", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`
        w-8 h-8 flex items-center justify-center rounded-full border
        transition-all duration-300
        ${added
          ? "bg-primary text-white border-primary scale-110 shadow-md"
          : "bg-white text-primary border-primary hover:bg-primary/10"}
        ${loading && "opacity-50"}
      `}
    >
      <span className="text-xl">{added ? "♥" : "♡"}</span>
    </button>
  );
}
