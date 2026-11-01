import { randomUUID } from "node:crypto";
import { getDatabase } from "../server/db.js";
import { hashPassword } from "../server/security.js";
const { ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
if (
  !ADMIN_EMAIL?.includes("@") ||
  !ADMIN_PASSWORD ||
  ADMIN_PASSWORD.length < 12
)
  throw new Error(
    "Set ADMIN_EMAIL and a unique ADMIN_PASSWORD of at least 12 characters in .env.",
  );
const db = await getDatabase();
if (!db) throw new Error("Database is required.");
const email = ADMIN_EMAIL.toLowerCase().trim();
const hash = await hashPassword(ADMIN_PASSWORD);
const existing = await db.m.User.findOne({ email });
const id =
  existing?._id ??
  (await db.m.User.create({
    _id: randomUUID(),
    name: "Store administrator",
    email,
    password_hash: hash,
    role: "admin",
    created_at: Date.now(),
  }))._id;
if (existing)
  await db.m.User.updateOne(
    { _id: existing._id },
    { $set: { password_hash: hash, role: "admin" } },
  );
await db.m.Session.deleteMany({ user_id: id });
console.log("Admin account updated; previous sessions revoked.");
await db.close();
