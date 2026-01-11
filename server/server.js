import express from "express";
import 'dotenv/config'
import connectDB from "./configs/db.js";
import bookRouter from "./routes/bookRoutes.js";
import adminRouter from "./routes/adminRoutes.js";
import cors from 'cors';
import authRouter from "./routes/authRoutes.js";
import wishlistRouter from "./routes/wishlistRoutes.js";
import recRouter from "./routes/recommendationRoutes.js";
import clerkWebhooks from "./controllers/webhooks.js";
import { clerkMiddleware } from '@clerk/express';
import subscriberRouter from "./routes/subscriberRoutes.js";

const app = express();

await connectDB();

// Middlewares
app.set("trust proxy", 1); // 🔥 REQUIRED even locally (important)

app.use(cors({
  origin: [
    "http://localhost:5173",
    "https://book-cart-eosin.vercel.app",
    "https://book-store-docker.vercel.app"
  ],
  credentials: true
}));

// ❗ Clerk MUST be BEFORE body parsers
app.use(clerkMiddleware());

app.use(express.json());

app.post("/webhooks", clerkWebhooks);

//Routes
app.get('/',(req,res)=> res.send("API is working"));

// app.post('/webhooks', clerkWebhooks);

app.use('/api/book', bookRouter);
app.use('/api/admin', adminRouter);
app.use('/api/auth', authRouter);
app.use('/api/wishlist', wishlistRouter);
app.use('/api/recommendations', recRouter);
app.use('/api/subscriptions', subscriberRouter);

const PORT = process.env.PORT || 3000;

app.head("/health", (req, res) => {
  res.status(200).end();
});

app.listen(PORT, () => {
    console.log('Server is running on port: ' + PORT)
});

export default app;