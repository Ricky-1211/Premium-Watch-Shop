import {
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
  createHash,
} from "node:crypto";
import { promisify } from "node:util";
const scrypt = promisify(scryptCallback);
export const digest = (value) =>
  createHash("sha256").update(value).digest("hex");
export async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = await scrypt(password, salt, 64);
  return salt + ":" + hash.toString("hex");
}
export async function verifyPassword(password, stored) {
  const [salt, key] = stored.split(":");
  const hash = await scrypt(password, salt, 64);
  const saved = Buffer.from(key, "hex");
  return hash.length === saved.length && timingSafeEqual(hash, saved);
}
export const publicUser = (u) => ({
  id: u.id,
  name: u.name,
  email: u.email,
  role: u.role,
});
export const cookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production" || !!process.env.VERCEL,
  sameSite: "lax",
  path: "/",
  maxAge: 7 * 86400000,
});
export async function createSession(db, userId, res) {
  const token = randomBytes(32).toString("hex");
  await db.m.Session.create({
    _id: digest(token),
    user_id: userId,
    expires_at: Date.now() + 7 * 86400000,
  });
  res.cookie("aurel_session", token, cookieOptions());
}
export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
export const requireUser = (req, res, next) =>
  req.user ? next() : next(new HttpError(401, "Please sign in to continue."));
export const requireAdmin = (req, res, next) =>
  req.user?.role === "admin"
    ? next()
    : next(new HttpError(403, "Administrator access is required."));
export async function rateLimit(db, key, max = 20, windowMs = 15 * 60000) {
  const now = Date.now();
  // Pipeline upsert: restart the window when the stored one has expired, even
  // before the TTL index removes the stale doc.
  const row = await db.m.RateLimit.findOneAndUpdate(
    { _id: digest(key) },
    [
      {
        $set: {
          count: {
            $cond: [
              { $lt: [{ $ifNull: ["$expires_at", 0] }, now] },
              1,
              { $add: ["$count", 1] },
            ],
          },
          expires_at: {
            $cond: [
              { $lt: [{ $ifNull: ["$expires_at", 0] }, now] },
              now + windowMs,
              "$expires_at",
            ],
          },
        },
      },
    ],
    {
      upsert: true,
      returnDocument: "after",
      updatePipeline: true,
    },
  );
  if (Number(row.count) > max)
    throw new HttpError(
      429,
      "Too many attempts. Please try again in 15 minutes.",
    );
}
