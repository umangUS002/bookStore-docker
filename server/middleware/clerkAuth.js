import { getAuth } from "@clerk/express";

export default function clerkAuth(req, res, next) {
  const auth = getAuth(req);

  if (!auth?.userId) {
    return res.status(401).json({ message: "Unauthorized (Clerk)" });
  }

  req.user = { id: auth.userId }; // 👈 STRING clerk userId
  next();
}
