import express from "express";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { randomUUID, createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import Razorpay from "razorpay";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { getDatabase, productFromRow, orderFromRow } from "./db.js";
import {
  HttpError,
  digest,
  hashPassword,
  verifyPassword,
  publicUser,
  createSession,
  cookieOptions,
  requireUser,
  requireAdmin,
  rateLimit,
} from "./security.js";
import {
  createOrder,
  changeOrderStatus,
  settleRazorpayEvent,
  settleRazorpayPayment,
} from "./orders.js";

const email = z.string().trim().toLowerCase().email().max(254);
const productSchema = z
  .object({
    name: z.string().trim().min(2).max(80),
    collection: z.enum(["Automatic", "Dress", "Chronograph", "Dive"]),
    price: z.number().int().min(100).max(100000000),
    stock: z.number().int().min(0).max(100000),
    image: z
      .string()
      .max(600)
      .refine(
        (s) =>
          /^\/images\/[a-z0-9-]+\.(png|jpg|webp)$/.test(s) ||
          /^https:\/\//.test(s),
        "Use a local image path or HTTPS image URL.",
      ),
    description: z.string().trim().min(10).max(1500),
    color: z.string().max(50),
    strap: z.string().max(80),
    movement: z.string().max(80),
    size: z.string().max(30),
    water: z.string().max(30),
    reserve: z.string().max(50),
    badge: z.string().max(40),
    featured: z.boolean(),
    active: z.boolean().default(true),
  })
  .strict();
const isDuplicateError = (e) => e?.code === 11000;

// The razorpay package compares signatures with `===`, which leaks timing
// information, so verification is done here with a constant-time compare.
const hmacEquals = (payload, signature, secret) => {
  if (!signature || !secret) return false;
  const expected = createHmac("sha256", secret).update(payload).digest("hex");
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(String(signature), "hex");
  return a.length === b.length && b.length > 0 && timingSafeEqual(a, b);
};

export function createApp({ database, razorpayClient } = {}) {
  const app = express();
  const dbProvider = database ? () => Promise.resolve(database) : getDatabase;
  const razorpay = () =>
    razorpayClient ||
    (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET
      ? new Razorpay({
          key_id: process.env.RAZORPAY_KEY_ID,
          key_secret: process.env.RAZORPAY_KEY_SECRET,
        })
      : null);
  const paymentsEnabled = () =>
    !!(
      razorpayClient ||
      (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET)
    );
  // Everything the browser needs to open Razorpay Checkout for a reserved order.
  const checkoutParams = (order, row) => ({
    orderId: row.razorpay_order_id,
    keyId: process.env.RAZORPAY_KEY_ID || razorpayClient?.key_id || "",
    amount: order.total,
    currency: "INR",
    name: "AUREL",
    description: `Order ${order.id}`,
    prefill: {
      email: order.email,
      name: order.address?.name,
      contact: String(order.address?.phone ?? "")
        .replace(/\D/g, "")
        .slice(0, 10),
    },
  });
  app.disable("x-powered-by");
  app.use(helmet({ crossOriginEmbedderPolicy: false }));
  app.use("/api", (req, res, next) => {
    res.set("Cache-Control", "no-store");
    next();
  });

  // Webhook must receive the exact raw bytes, before JSON middleware.
  app.post(
    "/api/payments/webhook",
    express.raw({ type: "application/json", limit: "256kb" }),
    async (req, res, next) => {
      try {
        if (!process.env.RAZORPAY_WEBHOOK_SECRET)
          throw new HttpError(503, "Online payments are not configured.");
        if (
          !hmacEquals(
            req.body,
            req.headers["x-razorpay-signature"],
            process.env.RAZORPAY_WEBHOOK_SECRET,
          )
        )
          throw new HttpError(400, "Invalid webhook signature.");
        let event;
        try {
          event = JSON.parse(req.body.toString("utf8"));
        } catch {
          throw new HttpError(400, "Invalid webhook payload.");
        }
        const db = await dbProvider();
        if (!db) throw new HttpError(503, "Database is not configured.");
        await settleRazorpayEvent(db, event);
        res.json({ received: true });
      } catch (e) {
        next(e);
      }
    },
  );
  app.use(express.json({ limit: "64kb" }));
  app.use(cookieParser());
  app.use("/api", (req, res, next) => {
    if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
    const origin = req.get("origin");
    const appOrigin = process.env.APP_URL?.replace(/\/$/, "");
    let matchesHost = false;
    try {
      matchesHost = new URL(origin).host === req.get("host");
    } catch {}
    if (
      (origin && origin !== appOrigin && !matchesHost) ||
      req.get("sec-fetch-site") === "cross-site"
    )
      return next(new HttpError(403, "Cross-site requests are not permitted."));
    if (
      req.get("x-aurel-client") !== "storefront" ||
      !req.is("application/json")
    )
      return next(
        new HttpError(403, "A same-origin JSON request is required."),
      );
    next();
  });
  app.get("/api/health", async (req, res, next) => {
    try {
      const db = await dbProvider();
      if (db) await db.ping();
      res.json({
        mode: db ? "live" : "demo",
        payments: { cod: true, razorpay: !!db && paymentsEnabled() },
      });
    } catch (e) {
      next(e);
    }
  });
  app.use("/api", async (req, res, next) => {
    try {
      req.db = await dbProvider();
      if (!req.db)
        throw new HttpError(
          503,
          "This deployment runs in demo mode. Configure MONGODB_URI for live orders.",
        );
      const token = req.cookies.aurel_session;
      if (token && /^[a-f0-9]{64}$/.test(token)) {
        const session = await req.db.m.Session.findOne({
          _id: digest(token),
          expires_at: { $gt: Date.now() },
        });
        if (session)
          req.user = await req.db.m.User.findOne({ _id: session.user_id });
      }
      next();
    } catch (e) {
      next(e);
    }
  });
  const ip = (req) =>
    process.env.VERCEL
      ? req.get("x-vercel-forwarded-for") || req.socket.remoteAddress
      : req.socket.remoteAddress;
  const throttle = async (req, suffix, max = 20) =>
    rateLimit(req.db, `${suffix}:${ip(req)}`, max);

  app.get("/api/products", async (req, res) =>
    res.json(
      (
        await req.db.m.Product.find({ active: true }).sort({ _id: 1 })
      ).map(productFromRow),
    ),
  );
  app.get("/api/auth/me", (req, res) =>
    res.json({ user: req.user ? publicUser(req.user) : null }),
  );
  app.post("/api/auth/register", async (req, res) => {
    await throttle(req, "register", 10);
    const data = z
      .object({
        name: z.string().trim().min(2).max(80),
        email,
        password: z.string().min(12).max(128),
      })
      .strict()
      .parse(req.body);
    const id = randomUUID();
    const hashed = await hashPassword(data.password);
    try {
      await req.db.m.User.create({
        _id: id,
        name: data.name,
        email: data.email,
        password_hash: hashed,
        role: "customer",
        created_at: Date.now(),
      });
    } catch (e) {
      if (isDuplicateError(e))
        throw new HttpError(409, "An account with this email already exists.");
      throw e;
    }
    await createSession(req.db, id, res);
    res
      .status(201)
      .json({
        user: { id, name: data.name, email: data.email, role: "customer" },
      });
  });
  app.post("/api/auth/login", async (req, res) => {
    await throttle(req, "login", 30);
    const data = z
      .object({ email, password: z.string().min(1).max(128) })
      .strict()
      .parse(req.body);
    await rateLimit(req.db, "account:" + data.email, 30);
    const user = await req.db.m.User.findOne({ email: data.email });
    const valid = await verifyPassword(
      data.password,
      user?.password_hash ||
        "00000000000000000000000000000000:" + "00".repeat(64),
    );
    if (!user || !valid)
      throw new HttpError(401, "Email or password is incorrect.");
    await createSession(req.db, user.id, res);
    res.json({ user: publicUser(user) });
  });
  app.post("/api/auth/logout", async (req, res) => {
    if (req.cookies.aurel_session)
      await req.db.m.Session.deleteOne({ _id: digest(req.cookies.aurel_session) });
    res.clearCookie("aurel_session", { ...cookieOptions(), maxAge: undefined });
    res.json({ ok: true });
  });
  app.get("/api/wishlist", requireUser, async (req, res) =>
    res.json(
      (
        await req.db.m.Wishlist.find({ user_id: req.user.id })
      ).map((r) => r.product_id),
    ),
  );
  app.put("/api/wishlist", requireUser, async (req, res) => {
    const ids = [...new Set(z.array(z.string().max(80)).max(100).parse(req.body.ids))];
    const valid = await req.db.m.Product.find(
      { _id: { $in: ids } },
      { _id: 1 },
    );
    const validIds = valid.map((p) => String(p._id));
    await req.db.m.Wishlist.deleteMany({ user_id: req.user.id });
    if (validIds.length)
      await req.db.m.Wishlist.insertMany(
        validIds.map((product_id) => ({ user_id: req.user.id, product_id })),
        { ordered: false },
      );
    res.json({ ok: true });
  });
  app.post("/api/newsletter", async (req, res) => {
    await throttle(req, "newsletter", 10);
    const input = z.object({ email, consent: z.literal(true) }).parse(req.body);
    await req.db.m.Subscriber.updateOne(
      { _id: input.email },
      { $setOnInsert: { created_at: Date.now() } },
      { upsert: true },
    );
    res.json({ ok: true });
  });
  app.get("/api/orders", requireUser, async (req, res) =>
    res.json(
      (
        await req.db.m.Order.find({ user_id: req.user.id })
          .sort({ created_at: -1 })
          .limit(100)
      ).map(orderFromRow),
    ),
  );
  app.get("/api/orders/:id", requireUser, async (req, res) => {
    const row = await req.db.m.Order.findOne({
      _id: req.params.id,
      user_id: req.user.id,
    });
    if (!row) throw new HttpError(404, "Order not found.");
    res.json(orderFromRow(row));
  });
  app.post("/api/orders", requireUser, async (req, res) => {
    await throttle(req, "order", 50);
    if (req.body.paymentMethod === "razorpay" && !paymentsEnabled())
      throw new HttpError(
        400,
        "Online payments are not configured. Choose cash on delivery.",
      );
    const order = await createOrder(
      req.db,
      req.user,
      req.body,
      req.get("idempotency-key"),
    );
    if (order.paymentMethod !== "razorpay" || order.paymentStatus === "paid")
      return res.status(201).json(order);
    if (order.status === "cancelled")
      throw new HttpError(
        409,
        "This order was cancelled. Start a new checkout from your bag.",
      );
    const row = await req.db.m.Order.findOne({ _id: order.id });
    const client = razorpay();
    try {
      if (!row.razorpay_order_id) {
        const created = await client.orders.create({
          amount: order.total,
          currency: "INR",
          receipt: order.id,
          notes: { orderId: order.id },
        });
        await req.db.m.Order.updateOne(
          { _id: order.id },
          { $set: { razorpay_order_id: created.id } },
        );
        row.razorpay_order_id = created.id;
      }
    } catch {
      throw new HttpError(
        502,
        "Payment provider is unavailable. Your order is reserved; retry this checkout with the same details.",
      );
    }
    res.status(201).json({ ...order, razorpay: checkoutParams(order, row) });
  });
  // The browser posts Razorpay's success handler result here. The signature
  // proves the handler response is genuine; the server-side payment fetch
  // proves the money actually arrived for the right amount.
  app.post("/api/orders/:id/verify", requireUser, async (req, res) => {
    const input = z
      .object({
        razorpay_order_id: z.string().min(1).max(64),
        razorpay_payment_id: z.string().min(1).max(64),
        razorpay_signature: z.string().length(64),
      })
      .strict()
      .parse(req.body);
    const row = await req.db.m.Order.findOne({
      _id: req.params.id,
      user_id: req.user.id,
    });
    if (!row || row.payment_method !== "razorpay")
      throw new HttpError(404, "Order not found.");
    if (row.payment_status === "paid") return res.json(orderFromRow(row));
    if (input.razorpay_order_id !== row.razorpay_order_id)
      throw new HttpError(400, "Payment does not match order.");
    if (
      !hmacEquals(
        `${input.razorpay_order_id}|${input.razorpay_payment_id}`,
        input.razorpay_signature,
        process.env.RAZORPAY_KEY_SECRET,
      )
    )
      throw new HttpError(400, "Payment signature could not be verified.");
    let payment;
    try {
      payment = await razorpay().payments.fetch(input.razorpay_payment_id);
    } catch {
      throw new HttpError(
        502,
        "Payment provider is unavailable. Your order is reserved; retry with the same details.",
      );
    }
    res.json(await settleRazorpayPayment(req.db, row, payment));
  });
  app.post("/api/orders/:id/resume", requireUser, async (req, res) => {
    const row = await req.db.m.Order.findOne({
      _id: req.params.id,
      user_id: req.user.id,
    });
    if (
      !row ||
      !row.razorpay_order_id ||
      row.status !== "awaiting_payment" ||
      row.payment_method !== "razorpay"
    )
      throw new HttpError(409, "No open payment is available.");
    let providerOrder;
    try {
      providerOrder = await razorpay().orders.fetch(row.razorpay_order_id);
    } catch {
      throw new HttpError(
        502,
        "Payment provider is unavailable. Retry in a moment.",
      );
    }
    if (providerOrder.status === "paid")
      throw new HttpError(
        409,
        "This payment was already captured. Refresh your order status.",
      );
    res.json({ razorpay: checkoutParams(orderFromRow(row), row) });
  });

  app.use("/api/admin", requireUser, requireAdmin);
  app.get("/api/admin/summary", async (req, res) => {
    const orders = (
      await req.db.m.Order.find({}).sort({ created_at: -1 }).limit(500)
    ).map(orderFromRow);
    const [revenueRow] = await req.db.m.Order.aggregate([
      { $match: { payment_status: "paid" } },
      { $group: { _id: null, total: { $sum: "$total" } } },
    ]);
    const revenue = revenueRow?.total ?? 0;
    const customerCount = await req.db.m.User.countDocuments({
      role: "customer",
    });
    const allProducts = (
      await req.db.m.Product.find({}).sort({ _id: 1 })
    ).map(productFromRow);
    res.json({
      orders,
      products: allProducts,
      stats: {
        orders: orders.length,
        revenue: Number(revenue ?? 0),
        customers: customerCount,
        lowStock: allProducts.filter((p) => p.stock < 5 && p.active).length,
      },
      audit: (
        await req.db.m.AuditLog.find({})
          .sort({ created_at: -1 })
          .limit(30)
      ).map((a) => ({
        id: String(a._id),
        actor_id: a.actor_id,
        action: a.action,
        target_id: a.target_id,
        created_at: a.created_at,
      })),
    });
  });
  app.post("/api/admin/products", async (req, res) => {
    const data = productSchema.parse(req.body);
    const id =
      data.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .slice(0, 55) +
      "-" +
      randomUUID().slice(0, 6);
    const { active, price, stock, ...rest } = data;
    await req.db.m.Product.create({
      _id: id,
      data: JSON.stringify(rest),
      price,
      stock,
      active,
    });
    await req.db.m.AuditLog.create({
      _id: randomUUID(),
      actor_id: req.user.id,
      action: "product:create",
      target_id: id,
      created_at: Date.now(),
    });
    res.status(201).json({ ...data, id });
  });
  app.put("/api/admin/products/:id", async (req, res) => {
    const data = productSchema.parse(req.body);
    const expectedStock = z.coerce
      .number()
      .int()
      .min(0)
      .safeParse(req.get("if-stock"));
    if (!expectedStock.success)
      throw new HttpError(
        400,
        "Stock version is required. Reload the product.",
      );
    const { active, price, stock, ...rest } = data;
    const updated = await req.db.m.Product.findOneAndUpdate(
      { _id: req.params.id, stock: expectedStock.data },
      { $set: { data: JSON.stringify(rest), price, stock, active } },
      { returnDocument: "after" },
    );
    if (!updated)
      throw new HttpError(
        409,
        "Stock changed or product was removed. Reload before saving.",
      );
    await req.db.m.AuditLog.create({
      _id: randomUUID(),
      actor_id: req.user.id,
      action: "product:update",
      target_id: req.params.id,
      created_at: Date.now(),
    });
    res.json({ ...data, id: req.params.id });
  });
  app.patch("/api/admin/orders/:id", async (req, res) => {
    const { status } = z
      .object({
        status: z.enum(["processing", "shipped", "delivered", "cancelled"]),
      })
      .strict()
      .parse(req.body);
    res.json(
      await changeOrderStatus(req.db, req.params.id, status, req.user.id),
    );
  });
  app.use("/api", (req, res) =>
    res.status(404).json({ error: "API endpoint not found." }),
  );
  if (existsSync(resolve("dist/index.html"))) {
    app.use(express.static(resolve("dist")));
    app.get("/{*path}", (req, res) => res.sendFile(resolve("dist/index.html")));
  }
  app.use((err, req, res, next) => {
    const status = err instanceof z.ZodError ? 400 : err.status || 500;
    if (status >= 500)
      console.error("Request failed:", err.name, err.code || "INTERNAL_ERROR");
    const message =
      err instanceof z.ZodError
        ? `${err.issues[0].path.join(".")}: ${err.issues[0].message}`
        : status >= 500
          ? "The store is temporarily unavailable. Please retry."
          : err.message;
    res.status(status).json({ error: message });
  });
  return app;
}
