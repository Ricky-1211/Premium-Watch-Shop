import { randomUUID } from "node:crypto";
import { z } from "zod";
import { totals } from "../shared/catalog.js";
import { productFromRow, orderFromRow } from "./db.js";
import { digest, HttpError } from "./security.js";
export const addressSchema = z
  .object({
    name: z.string().trim().min(2).max(100),
    phone: z
      .string()
      .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number."),
    line1: z.string().trim().min(5).max(180),
    city: z.string().trim().min(2).max(80),
    state: z.string().trim().min(2).max(80),
    postalCode: z
      .string()
      .regex(/^[1-9]\d{5}$/, "Enter a valid 6-digit PIN code."),
  })
  .strict();
export const checkoutSchema = z
  .object({
    items: z
      .array(
        z
          .object({
            id: z.string().max(80),
            quantity: z.number().int().min(1).max(5),
          })
          .strict(),
      )
      .min(1)
      .max(20),
    address: addressSchema,
    coupon: z.string().trim().max(20).default(""),
    paymentMethod: z.enum(["cod", "razorpay"]),
  })
  .strict();

const isDuplicate = (e) => e?.code === 11000;

// Stock is claimed with a conditional atomic update; there is no multi-row
// lock. Local MongoDB runs standalone (no transactions), so every step here
// relies on single-document atomicity instead.
async function claimStock(m, item) {
  const row = await m.Product.findOneAndUpdate(
    { _id: item.id, active: true, stock: { $gte: item.quantity } },
    { $inc: { stock: -item.quantity } },
    { returnDocument: "after" },
  );
  if (!row) {
    const existing = await m.Product.findOne({ _id: item.id, active: true });
    if (!existing)
      throw new HttpError(400, "An item in your bag is no longer available.");
    const p = productFromRow(existing);
    throw new HttpError(
      409,
      `${p.name}: only ${p.stock} available. Please update your bag.`,
    );
  }
  return productFromRow(row);
}

async function releaseStock(m, items) {
  for (const item of items)
    await m.Product.updateOne(
      { _id: item.id },
      { $inc: { stock: item.quantity } },
    );
}

export async function createOrder(db, user, raw, key) {
  const m = db.m;
  const input = checkoutSchema.parse(raw);
  if (!/^[a-zA-Z0-9_-]{16,80}$/.test(key || ""))
    throw new HttpError(400, "A valid checkout request key is required.");
  if (new Set(input.items.map((i) => i.id)).size !== input.items.length)
    throw new HttpError(400, "Duplicate product entries are not allowed.");
  input.coupon = input.coupon.toUpperCase();
  if (input.coupon && input.coupon !== "AUREL10")
    throw new HttpError(400, "This offer code is not valid.");
  const requestHash = digest(JSON.stringify(input));
  input.items.sort((a, b) => a.id.localeCompare(b.id));

  const existing = await m.Order.findOne({
    user_id: user.id,
    idempotency_key: key,
  });
  if (existing) {
    if (existing.request_hash !== requestHash)
      throw new HttpError(
        409,
        "This checkout key was already used for a different order.",
      );
    return orderFromRow(existing);
  }

  const items = [];
  const claimed = [];
  try {
    for (const item of input.items) {
      const p = await claimStock(m, item);
      claimed.push(item);
      items.push({
        id: p.id,
        name: p.name,
        image: p.image,
        price: p.price,
        quantity: item.quantity,
      });
    }
  } catch (e) {
    await releaseStock(m, claimed);
    throw e;
  }

  const calc = totals(items, input.coupon);
  const id = "AU-" + randomUUID().slice(0, 12).toUpperCase();
  const data = {
    items,
    address: input.address,
    coupon: input.coupon,
    email: user.email,
    ...calc,
  };
  const status =
    input.paymentMethod === "cod" ? "confirmed" : "awaiting_payment";
  try {
    await m.Order.create({
      _id: id,
      user_id: user.id,
      idempotency_key: key,
      request_hash: requestHash,
      data: JSON.stringify(data),
      total: calc.total,
      status,
      payment_method: input.paymentMethod,
      payment_status: "unpaid",
      created_at: Date.now(),
    });
  } catch (e) {
    if (!isDuplicate(e)) {
      await releaseStock(m, claimed);
      throw e;
    }
    // A concurrent retry with the same key won the insert.
    const winner = await m.Order.findOne({ user_id: user.id, idempotency_key: key });
    await releaseStock(m, claimed);
    if (!winner) throw e;
    if (winner.request_hash !== requestHash)
      throw new HttpError(
        409,
        "This checkout key was already used for a different order.",
      );
    return orderFromRow(winner);
  }
  return orderFromRow(await m.Order.findOne({ _id: id }));
}

const ALLOWED = {
  confirmed: ["processing", "cancelled"],
  processing: ["shipped", "cancelled"],
  shipped: ["delivered"],
  awaiting_payment: ["cancelled"],
  delivered: [],
  cancelled: [],
};

export async function changeOrderStatus(db, id, status, actor) {
  const m = db.m;
  const row = await m.Order.findOne({ _id: id });
  if (!row) throw new HttpError(404, "Order not found.");
  if (row.status === status) return orderFromRow(row);
  if (!ALLOWED[row.status]?.includes(status))
    throw new HttpError(409, "That order status transition is not allowed.");
  // An unpaid online order can still be cancelled to release its stock; a
  // captured payment needs a refund instead, so it stays blocked.
  if (
    row.payment_method === "razorpay" &&
    status === "cancelled" &&
    row.payment_status === "paid"
  )
    throw new HttpError(
      409,
      "This payment was captured. Refund it in the Razorpay dashboard before cancelling the order.",
    );
  const payment =
    status === "delivered" && row.payment_method === "cod"
      ? "paid"
      : row.payment_status;
  const updated = await m.Order.findOneAndUpdate(
    { _id: id, status: row.status },
    { $set: { status, payment_status: payment } },
    { returnDocument: "after" },
  );
  if (!updated) return changeOrderStatus(db, id, status, actor);
  if (status === "cancelled")
    await releaseStock(m, JSON.parse(updated.data).items);
  await m.AuditLog.create({
    _id: randomUUID(),
    actor_id: String(actor),
    action: `order:${status}`,
    target_id: id,
    created_at: Date.now(),
  });
  return orderFromRow(updated);
}

// Marks an order paid from a verified Razorpay payment entity. Called by both
// the webhook and the browser signature-verification route, so it must be
// idempotent and must not trust the caller's amount.
export async function settleRazorpayPayment(db, order, payment) {
  const m = db.m;
  const id = order._id ?? order.id;
  if (
    payment?.entity !== "payment" ||
    payment.status !== "captured" ||
    payment.order_id !== order.razorpay_order_id ||
    payment.amount !== order.total ||
    payment.currency !== "INR"
  )
    throw new HttpError(400, "Payment does not match order.");
  if (order.payment_status === "paid") return orderFromRow(order);
  if (order.status === "cancelled")
    throw new HttpError(409, "Cancelled order requires manual reconciliation.");
  const updated = await m.Order.findOneAndUpdate(
    { _id: id, payment_status: "unpaid", status: { $ne: "cancelled" } },
    {
      $set: {
        payment_status: "paid",
        status: "confirmed",
        razorpay_payment_id: payment.id,
      },
    },
    { returnDocument: "after" },
  );
  if (!updated) {
    const current = await m.Order.findOne({ _id: id });
    if (current?.payment_status === "paid") return orderFromRow(current);
    throw new HttpError(409, "Cancelled order requires manual reconciliation.");
  }
  await m.AuditLog.create({
    _id: randomUUID(),
    actor_id: "razorpay",
    action: "order:paid",
    target_id: String(id),
    created_at: Date.now(),
  });
  return orderFromRow(updated);
}

export async function settleRazorpayEvent(db, event) {
  if (!["payment.captured", "order.paid"].includes(event.event)) return;
  const payment = event.payload?.payment?.entity;
  if (!payment?.order_id) return;
  const row = await db.m.Order.findOne({
    razorpay_order_id: payment.order_id,
  });
  if (!row)
    throw new HttpError(409, "Order is not yet available. Retry webhook.");
  if (row.payment_method !== "razorpay")
    throw new HttpError(400, "Payment does not match order.");
  return settleRazorpayPayment(db, row, payment);
}
