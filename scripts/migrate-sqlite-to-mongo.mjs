// One-off data migration: copies an existing SQLite (or PostgreSQL-shaped)
// store into MongoDB collections. Idempotent: re-running upserts by _id.
import { DatabaseSync } from "node:sqlite";
import { resolve } from "node:path";
import { connectDatabase, initializeDatabase, parseMongoUri } from "../server/db.js";

const source = process.argv[2] || process.env.SQLITE_PATH || "./data/aurel.sqlite";
const file = resolve(source);
const db = await connectDatabase({
  url: process.env.MONGODB_URI,
  dbName: process.env.MIGRATE_TARGET_DB,
});
const target = parseMongoUri(process.env.MONGODB_URI || "");
console.log(`Migrating ${file} -> ${target}`);

const sqlite = new DatabaseSync(file, { readOnly: true });
const rows = (table) => sqlite.prepare(`SELECT * FROM ${table}`).all();
const stats = {};
const put = async (model, docs) => {
  for (const doc of docs)
    await model.updateOne({ _id: doc._id }, { $set: doc }, { upsert: true });
  return docs.length;
};

try {
  await initializeDatabase(db, {});

  stats.users = await put(
    db.m.User,
    rows("users").map((r) => ({
      _id: r.id,
      name: r.name,
      email: r.email,
      password_hash: r.password_hash,
      role: r.role,
      created_at: Number(r.created_at),
    })),
  );
  stats.sessions = await put(
    db.m.Session,
    rows("sessions").map((r) => ({
      _id: r.token_hash,
      user_id: r.user_id,
      expires_at: Number(r.expires_at),
    })),
  );
  stats.products = await put(
    db.m.Product,
    rows("products").map((r) => ({
      _id: r.id,
      data: r.data,
      price: Number(r.price),
      stock: Number(r.stock),
      active: !!r.active,
    })),
  );
  stats.orders = await put(
    db.m.Order,
    rows("orders").map((r) => ({
      _id: r.id,
      user_id: r.user_id,
      idempotency_key: r.idempotency_key,
      request_hash: r.request_hash,
      data: r.data,
      total: Number(r.total),
      status: r.status,
      payment_method: r.payment_method,
      payment_status: r.payment_status,
      created_at: Number(r.created_at),
    })),
  );
  stats.wishlist = 0;
  for (const r of rows("wishlist")) {
    await db.m.Wishlist.updateOne(
      { user_id: r.user_id, product_id: r.product_id },
      { $setOnInsert: { user_id: r.user_id, product_id: r.product_id } },
      { upsert: true },
    );
    stats.wishlist += 1;
  }
  stats.subscribers = await put(
    db.m.Subscriber,
    rows("subscribers").map((r) => ({
      _id: r.email,
      created_at: Number(r.created_at),
    })),
  );
  stats.rate_limits = await put(
    db.m.RateLimit,
    rows("rate_limits").map((r) => ({
      _id: r.key,
      count: Number(r.count),
      expires_at: Number(r.expires_at),
    })),
  );
  stats.audit_logs = await put(
    db.m.AuditLog,
    rows("audit_logs").map((r) => ({
      _id: r.id,
      actor_id: r.actor_id,
      action: r.action,
      target_id: r.target_id,
      created_at: Number(r.created_at),
    })),
  );

  for (const [name, count] of Object.entries(stats))
    console.log(`  ${name}: ${count} copied`);
  console.log("Migration complete. Verify counts with: mongosh --eval 'db.stats()'");
} finally {
  sqlite.close();
  await db.close();
}
