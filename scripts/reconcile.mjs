import Razorpay from "razorpay";
import { getDatabase } from "../server/db.js";
import { settleRazorpayPayment } from "../server/orders.js";
if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET)
  throw new Error("Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET first.");
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});
const db = await getDatabase();
if (!db) throw new Error("Configure a database first.");
try {
  const rows = await db.m.Order.find({
    payment_method: "razorpay",
    status: "awaiting_payment",
  })
    .sort({ created_at: 1 })
    .limit(500);
  for (const row of rows) {
    const id = String(row._id);
    if (!row.razorpay_order_id) {
      console.log(
        id +
          ": no Razorpay order linked; stock stays reserved until an admin cancels it. Review the dashboard before any manual stock adjustment.",
      );
      continue;
    }
    const providerOrder = await razorpay.orders.fetch(row.razorpay_order_id);
    if (providerOrder.status === "paid") {
      const { items } = await razorpay.orders.fetchPayments(
        row.razorpay_order_id,
      );
      const captured = (items || []).find((p) => p.status === "captured");
      if (captured) {
        await settleRazorpayPayment(db, row, captured);
        console.log(id + ": settled from captured payment " + captured.id);
        continue;
      }
    }
    console.log(id + ": Razorpay order status " + providerOrder.status);
  }
} finally {
  await db.close();
}
