import jwt from "jsonwebtoken";

const ACCESS_EXPIRE = "15m";
const REFRESH_EXPIRE = "7d";

export function signAccess(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: ACCESS_EXPIRE,
  });
}

export function signRefresh(payload) {
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
    expiresIn: REFRESH_EXPIRE,
  });
}

export const verify = jwt.verify;
