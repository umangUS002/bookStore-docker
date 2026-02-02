// client/src/contexts/AppContext.jsx
import { createContext, useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import axios from "axios";
import { useAuth, useUser } from '@clerk/clerk-react'

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const navigate = useNavigate();

  const { user } = useUser()
  const { getToken } = useAuth()

  // in-memory token (preferred)
  const [token, setToken] = useState(null);

  // keep localStorage compatibility for your existing flow
  const [persistToken, setPersistToken] = useState(() => localStorage.getItem("token"));

  const [input, setInput] = useState("");
  const [books, setBooks] = useState([]);
  const [similarBooks, setSimilarBooks] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [recommendations, setRecommendations] = useState([]);

  const [wishlistBooks, setWishlistBooks] = useState([]);

  // Create axios instance that sends cookies (refresh token)
  const API_BASE = import.meta.env.VITE_BASE_URL || "http://localhost:3000";
  axios.defaults.baseURL = import.meta.env.VITE_BASE_URL || "http://localhost:3000";
  axios.defaults.withCredentials = true;


  // --- BOOKS / SIMILAR ---
  const fetchBooks = async () => {
    try {
      const { data } = await axios.get("/api/book/all");
      if (data?.success) setBooks(data.books);
      else toast.error(data?.message || "Failed to load books");
    } catch (error) {
      toast.error(error?.response?.data?.message || error.message);
    }
  };

  // try recommendation service endpoint first, otherwise fall back to your older path
  const fetchSimilarBooks = async (bookId) => {
    try {
      // try /api/recommendations/book/:bookId (recommender proxy)
      let resp;
      try {
        resp = await axios.get(`/api/recommendations/book/${bookId}`);
        // if the recommender returns raw books (array) use it
        if (Array.isArray(resp.data)) {
          setSimilarBooks(resp.data);
          return;
        }
      } catch (e) {
        // fallback to older endpoint below
      }

      // fallback to existing endpoint you had in the app
      const fallback = await axios.get(`/api/book/similar-books/${bookId}`);
      const payload = fallback.data;
      if (payload?.success) setSimilarBooks(payload.similarBooks || []);
      else toast.error(payload?.message || "No similar books found");
    } catch (error) {
      toast.error(error?.response?.data?.message || error.message);
    }
  };

  // --- WISHLIST ---
  const getWishlist = async () => {
    try {
      const token = await getToken();
      if (!token) return;

      const { data } = await axios.get("/api/wishlist", {
        headers: { Authorization: `Bearer ${token}` }
      });

      const ids = data.map(item => item.bookId?._id || item.bookId);
      setWishlist(ids);
    } catch (err) {
      toast.error("Failed to load wishlist");
    }
  };

  const addToWishlist = async (bookId) => {
    try {
      const { data } = await axios.post("/api/wishlist", { bookId });
      toast.success("Added to wishlist");
      // refresh local wishlist
      await getWishlist();
      return data;
    } catch (err) {
      toast.error(err?.response?.data?.message || err.message);
      throw err;
    }
  };

  const removeFromWishlist = async (bookId) => {
    try {
      await axios.delete(`/api/wishlist/${bookId}`);
      toast.success("Removed from wishlist");
      await getWishlist();
    } catch (err) {
      toast.error(err?.response?.data?.message || err.message);
      throw err;
    }
  };

  // --- COMMENTS (creates comment via server which will call sentiment microservice) ---
  const postComment = async (bookId, text, rating = null) => {
    try {
      const { data } = await axios.post(`/api/books/${bookId}/comments`, { text, rating });
      toast.success("Comment posted");
      return data;
    } catch (err) {
      toast.error(err?.response?.data?.message || err.message);
      throw err;
    }
  };

  // --- RECOMMENDATIONS ---
  const getRecommendations = async () => {
    try {
      const { data } = await axios.get("/api/recommendations");
      setRecommendations(Array.isArray(data) ? data : []);
      return data;
    } catch (err) {
      toast.error(err?.response?.data?.message || err.message);
      return [];
    }
  };

  useEffect(() => {
  const savedToken = localStorage.getItem("token"); // or "adminToken"

  if (savedToken) {
    setToken(savedToken);
    axios.defaults.headers.common[
      "Authorization"
    ] = savedToken;
  }
}, []);

  useEffect(() => {
    if (!wishlist?.length) {
      setWishlistBooks([]);
      return;
    }

    const fetchWishlistBooks = async () => {
      try {
        const { data } = await axios.post("/api/book/by-ids", {
          ids: wishlist
        });

        setWishlistBooks(data);
      } catch (err) {
        toast.error("Failed to load wishlist books");
      }
    };

    fetchWishlistBooks();
  }, [wishlist]);

  // --- INIT / EFFECTS ---
  useEffect(() => {
    fetchBooks();
    getWishlist();
    getRecommendations();
  }, [])

  const value = {

    axios, // raw axios instance if you need it directly
    navigate,
    token,
    setToken,
    input,
    setInput,
    books,
    setBooks,
    fetchBooks,
    similarBooks,
    setSimilarBooks,
    fetchSimilarBooks,

    // auth
    // login,
    // signup,
    // logout,

    // wishlist
    wishlist,
    wishlistBooks,
    setWishlist,
    getWishlist,
    addToWishlist,
    removeFromWishlist,

    // comments
    postComment,

    // recommendations
    recommendations,
    getRecommendations,


  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = () => {
  return useContext(AppContext);
};
