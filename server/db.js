import mongoose from "mongoose";
import { randomUUID } from "node:crypto";
import { products } from "../shared/catalog.js";
import { hashPassword } from "./security.js";
import { bindModels } from "./models.js";

export function parseMongoUri(url = "") {
  try {
    return new URL(url).pathname.slice(1) || "aurel";
  } catch {
    return "aurel";
  }
}

export async function connectDatabase({
  url = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/aurel",
  dbName,
} = {}) {
  const conn = mongoose.createConnection(url, {
    dbName,
    serverSelectionTimeoutMS: 8000,
  });
  await conn.asPromise();
  const m = bindModels(conn);
  const row = (doc) => (doc ? doc.toObject({ virtuals: true }) : null);
  const db = {
    kind: "mongodb",
    conn,
    m,
    async ping() {
      await conn.db.command({ ping: 1 });
    },
    async close() {
      await conn.close();
    },
  };
  return db;
}

export async function initializeDatabase(
  db,
  {
    adminEmail = process.env.ADMIN_EMAIL,
    adminPassword = process.env.ADMIN_PASSWORD,
  } = {},
) {
  if (
    adminPassword &&
    (adminPassword.length < 12 || !adminEmail?.includes("@"))
  )
    throw new Error(
      "Admin configuration requires an email and a password of at least 12 characters.",
    );
  for (const model of Object.values(db.m)) await model.syncIndexes();
  for (const p of products) {
    const { id, price, stock, ...rest } = p;
    await db.m.Product.updateOne(
      { _id: id },
      { $setOnInsert: { data: JSON.stringify(rest), price, stock, active: true } },
      { upsert: true },
    );
  }
  if (adminPassword) {
    const pass = await hashPassword(adminPassword);
    const existing = await db.m.User.findOne({
      email: adminEmail.toLowerCase().trim(),
    });
    if (!existing)
      await db.m.User.create({
        _id: randomUUID(),
        name: "Store administrator",
        email: adminEmail.toLowerCase().trim(),
        password_hash: pass,
        role: "admin",
        created_at: Date.now(),
      });
  }
  return db;
}

let pending;
export function getDatabase() {
  if (process.env.VERCEL && !process.env.MONGODB_URI)
    return Promise.resolve(null);
  if (!pending)
    pending = connectDatabase()
      .then((db) => initializeDatabase(db))
      .catch((e) => {
        pending = null;
        throw e;
      });
  return pending;
}
export const productFromRow = (r) => ({
  ...JSON.parse(r.data),
  id: r.id,
  price: r.price,
  stock: r.stock,
  active: !!r.active,
});
export const orderFromRow = (r) => ({
  ...JSON.parse(r.data),
  id: r.id,
  total: r.total,
  status: r.status,
  paymentMethod: r.payment_method,
  paymentStatus: r.payment_status,
  createdAt: Number(r.created_at),
});
