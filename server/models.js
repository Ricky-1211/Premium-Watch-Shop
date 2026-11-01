import { Schema } from "mongoose";

// Documents keep the legacy SQL row shape (_id = old TEXT PRIMARY KEY) so the
// migration from SQLite/PostgreSQL is a straight field-for-field copy.
const base = {
  _id: String,
  id: { virtual: true },
  versionKey: false,
  toObject: {
    virtuals: true,
    transform: (_doc, ret) => {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    },
  },
};

export const UserSchema = new Schema(
  {
    _id: String,
    name: { type: String, required: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    password_hash: String,
    role: { type: String, enum: ["customer", "admin"], default: "customer" },
    created_at: Number,
  },
  base,
);
UserSchema.index({ email: 1 }, { unique: true });

export const SessionSchema = new Schema(
  {
    _id: String, // token_hash
    user_id: { type: String, required: true },
    expires_at: { type: Number, required: true },
  },
  base,
);
SessionSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });

export const ProductSchema = new Schema(
  {
    _id: String,
    data: { type: String, required: true }, // JSON blob of display fields
    price: { type: Number, required: true, min: 100 },
    stock: { type: Number, required: true, min: 0 },
    active: { type: Boolean, default: true },
  },
  base,
);

export const OrderSchema = new Schema(
  {
    _id: String, // "AU-..."
    user_id: { type: String, required: true },
    idempotency_key: { type: String, required: true },
    request_hash: { type: String, required: true },
    data: { type: String, required: true }, // JSON blob of items/address/totals
    total: { type: Number, required: true },
    status: { type: String, required: true },
    payment_method: { type: String, required: true },
    payment_status: { type: String, required: true },
    razorpay_order_id: String,
    razorpay_payment_id: String,
    created_at: Number,
  },
  base,
);
OrderSchema.index({ user_id: 1, created_at: -1 });
OrderSchema.index({ user_id: 1, idempotency_key: 1 }, { unique: true });

export const WishlistSchema = new Schema(
  {
    user_id: { type: String, required: true },
    product_id: { type: String, required: true },
  },
  { versionKey: false, toObject: { virtuals: true } },
);
WishlistSchema.index({ user_id: 1, product_id: 1 }, { unique: true });

export const SubscriberSchema = new Schema(
  { _id: String, created_at: Number },
  base,
);

export const RateLimitSchema = new Schema(
  {
    _id: String, // hashed bucket key
    count: { type: Number, default: 0 },
    expires_at: { type: Number, required: true },
  },
  base,
);
RateLimitSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });

export const AuditLogSchema = new Schema(
  {
    _id: String,
    actor_id: { type: String, required: true },
    action: { type: String, required: true },
    target_id: { type: String, required: true },
    created_at: Number,
  },
  base,
);
AuditLogSchema.index({ created_at: -1 });

export const SCHEMAS = {
  User: UserSchema,
  Session: SessionSchema,
  Product: ProductSchema,
  Order: OrderSchema,
  Wishlist: WishlistSchema,
  Subscriber: SubscriberSchema,
  RateLimit: RateLimitSchema,
  AuditLog: AuditLogSchema,
};

// Bind models to a specific connection so tests can use isolated databases.
// autoIndex is off; initializeDatabase() builds indexes explicitly.
export function bindModels(conn) {
  conn.set("strict", "throw");
  conn.set("autoIndex", false);
  const m = {};
  for (const [name, schema] of Object.entries(SCHEMAS))
    m[name] = conn.models[name] || conn.model(name, schema);
  return m;
}
