import bcrypt from "bcrypt";
import User from "../models/User.js";
import { signAccess, signRefresh } from "../utils/jwt.js";
import jwt from "jsonwebtoken";

/**
 * Signup - create user, return access token and set refresh cookie
 */
export async function signup(req, res) {
  try {
    const { name, email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: "Missing fields" });

    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: "User already exists" });

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ name, email, passwordHash });

    const access = signAccess({ id: user._id, role: user.role });
    const refresh = signRefresh({ id: user._id });

    res.cookie("refreshToken", refresh, { httpOnly: true, sameSite: "lax", secure: false });
    return res.status(201).json({ user: { id: user._id, email: user.email }, accessToken: access });
  } catch (err) {
    console.error("signup err:", err);
    return res.status(500).json({ message: "Server error" });
  }
}

/**
 * Login - verify credentials, return access token and set refresh cookie
 */
export async function login(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: "Missing fields" });

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(400).json({ message: "Invalid credentials" });

    const access = signAccess({ id: user._id, role: user.role });
    const refresh = signRefresh({ id: user._id });

    res.cookie("refreshToken", refresh, { httpOnly: true, sameSite: "lax", secure: false });
    return res.json({ user: { id: user._id, email: user.email }, accessToken: access });
  } catch (err) {
    console.error("login err:", err);
    return res.status(500).json({ message: "Server error" });
  }
}

/**
 * Refresh - read refresh cookie, validate and issue new access token
 */
export async function refreshToken(req, res) {
  try {
    const token = req.cookies?.refreshToken;
    if (!token) return res.status(401).json({ message: "No refresh token" });

    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    } catch (e) {
      return res.status(401).json({ message: "Invalid refresh token" });
    }

    const access = signAccess({ id: payload.id });
    return res.json({ accessToken: access });
  } catch (err) {
    console.error("refresh err:", err);
    return res.status(500).json({ message: "Server error" });
  }
}

/**
 * Logout - clear refresh cookie
 */
export async function logout(req, res) {
  try {
    res.clearCookie("refreshToken");
    return res.json({ ok: true });
  } catch (err) {
    console.error("logout err:", err);
    return res.status(500).json({ message: "Server error" });
  }
}
