import { products as seed, totals } from "../shared/catalog.js";

export const readLocal = (key, fallback) => {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
};
export const writeLocal = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* Private browsers can deny storage; the current session remains usable. */
  }
};
export const newId = () =>
  typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) =>
        b.toString(16).padStart(2, "0"),
      ).join("");
const demoKey = "aurel-demo-v1";
let memory;
function state() {
  return (
    memory ??
    (memory = readLocal(demoKey, {
      products: seed.map((p) => ({ ...p, active: true })),
      orders: [],
      user: null,
      wishlist: [],
      subscribers: [],
    }))
  );
}
function save() {
  writeLocal(demoKey, memory);
}
export function resetDemo() {
  memory = null;
  localStorage.removeItem(demoKey);
  localStorage.removeItem("aurel-bag-demo");
  location.reload();
}
export async function bootMode() {
  const forced = import.meta.env.VITE_APP_MODE || "auto";
  if (forced === "demo")
    return { mode: "demo", payments: { cod: true, razorpay: false } };
  try {
    const res = await fetch("/api/health", {
      signal: AbortSignal.timeout(5000),
      cache: "no-store",
    });
    if (res.headers.get("content-type")?.includes("application/json")) {
      const data = await res.json();
      if (!res.ok)
        throw new Error(
          data.error || "Backend unavailable. Check the server configuration.",
        );
      if (forced === "live" && data.mode !== "live")
        throw new Error(
          "Live mode requires a configured database. Set MONGODB_URI and redeploy.",
        );
      if (data.mode === "live" || data.mode === "demo") return data;
    }
    if (forced === "live")
      throw new Error("The live API was not found. Check your deployment.");
  } catch (e) {
    if (
      forced === "live" ||
      !(e instanceof TypeError || e.name === "TimeoutError")
    )
      throw e;
  }
  return { mode: "demo", payments: { cod: true, razorpay: false } };
}
export function client(mode) {
  return async (path, { method = "GET", body, headers = {} } = {}) => {
    if (mode === "demo") return demo(path, method, body, headers);
    const res = await fetch("/api" + path, {
      method,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "X-Aurel-Client": "storefront",
        ...headers,
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
    const data = await res
      .json()
      .catch(() => ({ error: "Unexpected server response. Please retry." }));
    if (!res.ok) throw new Error(data.error || "Something went wrong.");
    return data;
  };
}

async function demo(path, method, body, headers) {
  const s = state();
  let result;
  if (path === "/products") return s.products.filter((p) => p.active);
  if (path === "/auth/me") return { user: s.user };
  if (path === "/auth/demo") {
    s.user = {
      id: body.role === "admin" ? "demo-admin" : "demo-customer",
      name: body.role === "admin" ? "Demo administrator" : "Alex Morgan",
      email: body.role === "admin" ? "admin@example.com" : "alex@example.com",
      role: body.role,
    };
    result = { user: s.user };
  } else if (path === "/auth/logout") {
    s.user = null;
    result = { ok: true };
  } else if (path === "/wishlist") {
    if (method === "GET") return s.wishlist;
    s.wishlist = body.ids;
    result = { ok: true };
  } else if (path === "/newsletter") {
    s.subscribers.push(body.email);
    result = { ok: true };
  } else if (path.startsWith("/admin")) {
    if (s.user?.role !== "admin")
      throw new Error("Enter the demo administrator account first.");
    if (path === "/admin/summary")
      return {
        products: s.products,
        orders: s.orders,
        stats: {
          orders: s.orders.length,
          revenue: s.orders
            .filter((o) => o.paymentStatus === "paid")
            .reduce((a, o) => a + o.total, 0),
          customers: s.orders.length ? 1 : 0,
          lowStock: s.products.filter((p) => p.stock < 5).length,
        },
        audit: [],
      };
    if (path === "/admin/products") {
      const p = { ...body, id: "watch-" + newId().slice(0, 8) };
      s.products.push(p);
      result = p;
    } else if (path.startsWith("/admin/products/")) {
      const id = path.split("/").pop();
      const p = s.products.find((p) => p.id === id);
      if (!p) throw new Error("Product not found.");
      Object.assign(p, body);
      result = p;
    } else if (path.startsWith("/admin/orders/")) {
      const o = s.orders.find((o) => o.id === path.split("/").pop());
      if (!o) throw new Error("Order not found.");
      const next = {
        confirmed: ["processing", "cancelled"],
        processing: ["shipped", "cancelled"],
        shipped: ["delivered"],
      };
      if (!next[o.status]?.includes(body.status))
        throw new Error("That status transition is not available.");
      if (body.status === "cancelled")
        o.items.forEach((i) => {
          const p = s.products.find((p) => p.id === i.id);
          if (p) p.stock += i.quantity;
        });
      o.status = body.status;
      if (o.status === "delivered") o.paymentStatus = "paid";
      result = o;
    }
  } else if (path.startsWith("/orders")) {
    if (!s.user) throw new Error("Please enter a demo account first.");
    if (method === "GET") {
      if (path === "/orders")
        return s.orders.filter((o) => o.userId === s.user.id);
      const o = s.orders.find(
        (o) => o.id === path.split("/").pop() && o.userId === s.user.id,
      );
      if (!o) throw new Error("Order not found.");
      return o;
    }
    const old = s.orders.find(
      (o) => o.key === headers["Idempotency-Key"] && o.userId === s.user.id,
    );
    if (old) return old;
    if (body.coupon && body.coupon.toUpperCase() !== "AUREL10")
      throw new Error("This offer code is not valid.");
    const items = body.items.map((i) => {
      const p = s.products.find((p) => p.id === i.id && p.active);
      if (!p || p.stock < i.quantity)
        throw new Error("A watch is no longer available in that quantity.");
      return {
        id: p.id,
        name: p.name,
        image: p.image,
        price: p.price,
        quantity: i.quantity,
      };
    });
    items.forEach((i) => {
      s.products.find((p) => p.id === i.id).stock -= i.quantity;
    });
    result = {
      id: "DEMO-" + newId().slice(0, 8).toUpperCase(),
      userId: s.user.id,
      key: headers["Idempotency-Key"],
      items,
      ...totals(items, body.coupon),
      address: body.address,
      email: s.user.email,
      coupon: body.coupon,
      paymentMethod: "cod",
      paymentStatus: "unpaid",
      status: "confirmed",
      createdAt: Date.now(),
    };
    s.orders.unshift(result);
  }
  if (!result) throw new Error("This action is not available.");
  save();
  return structuredClone(result);
}
