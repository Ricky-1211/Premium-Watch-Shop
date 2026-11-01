import React, { useState, useEffect } from "react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import {
  ArrowRight,
  ArrowLeft,
  Plus,
  Minus,
  Trash2,
  LockKeyhole,
  ShieldCheck,
  Package,
  Check,
  RefreshCw,
  LogOut,
  Printer,
  UserRound,
} from "lucide-react";
import { useStore } from "./store";
import { newId } from "./api";
import { openRazorpay } from "./razorpay";
import { money, totals } from "../shared/catalog";
import { Breadcrumb, Empty } from "./App";

export function Summary({ items, coupon = "", children }) {
  const t = totals(items, coupon);
  return (
    <aside className="order-summary">
      <p className="eyebrow">THE FINER DETAILS</p>
      <h2>Your summary</h2>
      <div className="summary-lines">
        <div>
          <span>Subtotal</span>
          <span>{money(t.subtotal)}</span>
        </div>
        {t.discount > 0 && (
          <div className="discount">
            <span>AUREL10 applied</span>
            <span>− {money(t.discount)}</span>
          </div>
        )}
        <div>
          <span>Delivery</span>
          <span>{t.shipping ? money(t.shipping) : "Complimentary"}</span>
        </div>
        <div className="summary-total">
          <strong>Total</strong>
          <strong>{money(t.total)}</strong>
        </div>
        <small>All taxes included. Final price verified at checkout.</small>
      </div>
      {children}
      <div className="summary-trust">
        <ShieldCheck size={17} />
        <span>Thoughtfully chosen. Securely ordered.</span>
      </div>
    </aside>
  );
}
export function Bag() {
  const { cartItems, updateCart } = useStore();
  return (
    <div className="page">
      <Breadcrumb>Your bag</Breadcrumb>
      <div className="page-title">
        <p className="eyebrow">A GOOD CHOICE</p>
        <h1>Your shopping bag.</h1>
      </div>
      {!cartItems.length ? (
        <Empty
          title="Make time for something special."
          description="Your next timepiece is waiting to be discovered."
        />
      ) : (
        <div className="commerce-layout">
          <div>
            <div className="bag-table-head">
              <span>YOUR TIMEPIECE</span>
              <span>QUANTITY & PRICE</span>
            </div>
            {cartItems.map((p) => (
              <article className="bag-item" key={p.id}>
                <Link to={"/product/" + p.id}>
                  <img src={p.image} alt={p.name} />
                </Link>
                <div className="bag-info">
                  <small>{p.collection}</small>
                  <Link to={"/product/" + p.id}>
                    <h3>{p.name}</h3>
                  </Link>
                  <p>
                    {p.color} · {p.size}
                  </p>
                  <strong>{money(p.price)}</strong>
                  {p.quantity > p.stock && (
                    <p className="error-text">
                      Only {p.stock} available. Update or remove this item.
                    </p>
                  )}
                  <button
                    className="remove"
                    onClick={() => updateCart(p.id, 0)}
                  >
                    <Trash2 size={13} />
                    Remove
                  </button>
                </div>
                <div className="bag-quantity">
                  <div className="quantity">
                    <button
                      aria-label={"Decrease " + p.name + " quantity"}
                      onClick={() => updateCart(p.id, p.quantity - 1)}
                    >
                      <Minus size={13} />
                    </button>
                    <span>{p.quantity}</span>
                    <button
                      aria-label={"Increase " + p.name + " quantity"}
                      disabled={p.quantity >= Math.min(5, p.stock)}
                      onClick={() => updateCart(p.id, p.quantity + 1)}
                    >
                      <Plus size={13} />
                    </button>
                  </div>
                  <strong>{money(p.price * p.quantity)}</strong>
                </div>
              </article>
            ))}
            <Link to="/shop" className="text-link">
              <ArrowLeft size={16} />
              Continue discovering
            </Link>
          </div>
          <Summary items={cartItems}>
            <Link className="button full" to="/checkout">
              Proceed to checkout
              <ArrowRight size={17} />
            </Link>
            <p className="coupon-hint">
              A little welcome: use <strong>AUREL10</strong> for 10% off, up to
              ₹5,000.
            </p>
          </Summary>
        </div>
      )}
    </div>
  );
}
const sampleAddress = {
  name: "Alex Morgan",
  phone: "9876543210",
  line1: "12 Sample Avenue",
  city: "Dehradun",
  state: "Uttarakhand",
  postalCode: "248001",
};
// Razorpay runs in the browser, so its handler payload is posted to the server,
// which re-verifies the signature and the captured amount before marking paid.
async function pay(api, orderId, params) {
  return api("/orders/" + orderId + "/verify", {
    method: "POST",
    body: await openRazorpay(params),
  });
}
export function Checkout() {
  const {
    user,
    mode,
    cartItems,
    payments,
    api,
    setCart,
    reloadProducts,
    notify,
  } = useStore();
  const [coupon, setCoupon] = useState(""),
    [couponInput, setCouponInput] = useState(""),
    [payment, setPayment] = useState("cod"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const navigate = useNavigate();
  async function place(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const fd = new FormData(e.currentTarget);
    const address = Object.fromEntries(
      ["name", "phone", "line1", "city", "state", "postalCode"].map((k) => [
        k,
        String(fd.get(k)).trim(),
      ]),
    );
    const body = {
      items: cartItems.map((i) => ({ id: i.id, quantity: i.quantity })),
      address,
      coupon,
      paymentMethod: payment,
    };
    try {
      if (cartItems.some((i) => i.quantity > i.stock))
        throw new Error("Please update unavailable quantities in your bag.");
      const fingerprint = JSON.stringify(body);
      let draft;
      try {
        draft = JSON.parse(sessionStorage.getItem("aurel-checkout"));
      } catch {}
      if (draft?.fingerprint !== fingerprint)
        draft = { fingerprint, key: newId() };
      sessionStorage.setItem("aurel-checkout", JSON.stringify(draft));
      const order = await api("/orders", {
        method: "POST",
        body,
        headers: { "Idempotency-Key": draft.key },
      });
      setCart([]);
      sessionStorage.removeItem("aurel-checkout");
      // The accepted order stays successful even if a later catalog refresh fails.
      reloadProducts().catch((e) => notify(e.message));
      if (order.razorpay)
        try {
          await pay(api, order.id, order.razorpay);
        } catch (e) {
          // The order is already reserved; its page offers a resume button.
          notify(e.message);
        }
      navigate("/orders/" + order.id);
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  }
  if (!cartItems.length)
    return (
      <Empty
        title="Your bag is taking a moment."
        description="Add a timepiece before checking out."
      />
    );
  if (!user)
    return (
      <Empty
        title="Make yourself at home."
        description="Sign in or create an account to keep your orders in one place."
        link="/account?next=/checkout"
        label="Continue to your account"
      />
    );
  return (
    <div className="page">
      <Breadcrumb>
        <Link to="/bag">Your bag</Link>
        <span>/</span>Checkout
      </Breadcrumb>
      <div className="page-title">
        <p className="eyebrow">ONE STEP CLOSER</p>
        <h1>The next chapter is yours.</h1>
      </div>
      {mode === "demo" && (
        <div className="notice">
          Demo checkout — use the sample address below. No payment is taken and
          no real order is placed.
        </div>
      )}
      <form className="commerce-layout checkout-form" onSubmit={place}>
        <div className="checkout-fields">
          <section>
            <h2>
              <span>01</span>Contact & delivery
            </h2>
            <p className="subtle">
              Signed in as {user.email} · Delivery within India
            </p>
            <div className="form-grid">
              {[
                ["name", "Full name", "text"],
                ["phone", "Mobile number", "tel"],
                ["line1", "Street address", "text"],
                ["city", "City", "text"],
                ["state", "State", "text"],
                ["postalCode", "PIN code", "text"],
              ].map(([key, label, type]) => (
                <label className={key === "line1" ? "wide" : ""} key={key}>
                  {label}
                  <input
                    required
                    name={key}
                    type={type}
                    defaultValue={
                      mode === "demo"
                        ? sampleAddress[key]
                        : key === "name"
                          ? user.name
                          : ""
                    }
                    maxLength={
                      key === "phone"
                        ? 10
                        : key === "postalCode"
                          ? 6
                          : key === "line1"
                            ? 180
                            : 80
                    }
                    minLength={
                      key === "name" ? 2 : key === "line1" ? 5 : undefined
                    }
                    pattern={
                      key === "phone"
                        ? "[6-9][0-9]{9}"
                        : key === "postalCode"
                          ? "[1-9][0-9]{5}"
                          : undefined
                    }
                    inputMode={
                      key === "phone" || key === "postalCode"
                        ? "numeric"
                        : undefined
                    }
                    autoComplete={
                      {
                        name: "name",
                        phone: "tel-national",
                        line1: "address-line1",
                        city: "address-level2",
                        state: "address-level1",
                        postalCode: "postal-code",
                      }[key]
                    }
                  />
                </label>
              ))}
            </div>
          </section>
          <section>
            <h2>
              <span>02</span>A little extra
            </h2>
            <div className="coupon-field">
              <input
                aria-label="Offer code"
                placeholder="Offer code — try AUREL10"
                value={couponInput}
                onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
              />
              <button
                type="button"
                className="button secondary"
                onClick={() => {
                  if (couponInput.trim() === "AUREL10") {
                    setCoupon("AUREL10");
                    setError("");
                  } else if (!couponInput.trim()) {
                    setCoupon("");
                    setError("");
                  } else setError("Use AUREL10 for 10% off up to ₹5,000.");
                }}
              >
                Apply
              </button>
            </div>
            {coupon && (
              <p className="success-text">
                AUREL10 applied.{" "}
                <button
                  type="button"
                  className="inline-button"
                  onClick={() => {
                    setCoupon("");
                    setCouponInput("");
                  }}
                >
                  Remove
                </button>
              </p>
            )}
          </section>
          <section>
            <h2>
              <span>03</span>Payment
            </h2>
            <label
              className={
                "payment-option " + (payment === "cod" ? "selected" : "")
              }
            >
              <input
                type="radio"
                name="payment"
                value="cod"
                checked={payment === "cod"}
                onChange={() => setPayment("cod")}
              />
              <span>
                <strong>Cash on delivery</strong>
                <small>Pay when your timepiece arrives.</small>
              </span>
              <Package size={22} />
            </label>
            {payments.razorpay && (
              <label
                className={
                  "payment-option " + (payment === "razorpay" ? "selected" : "")
                }
              >
                <input
                  type="radio"
                  name="payment"
                  value="razorpay"
                  checked={payment === "razorpay"}
                  onChange={() => setPayment("razorpay")}
                />
                <span>
                  <strong>Pay online</strong>
                  <small>
                    Cards, UPI, net banking and wallets via Razorpay.
                  </small>
                </span>
                <LockKeyhole size={22} />
              </label>
            )}
          </section>
          <label className="checkbox terms">
            <input type="checkbox" required />I have reviewed the{" "}
            <Link to="/help/privacy">terms</Link> and{" "}
            <Link to="/help/delivery">delivery policy</Link>.
          </label>
          {error && (
            <div className="error" role="alert">
              {error}
            </div>
          )}
        </div>
        <Summary items={cartItems} coupon={coupon}>
          <div className="checkout-mini-items">
            {cartItems.map((i) => (
              <div key={i.id}>
                <img src={i.image} alt="" />
                <span>
                  {i.name}
                  <small>Quantity {i.quantity}</small>
                </span>
              </div>
            ))}
          </div>
          <button className="button full" disabled={busy}>
            {busy
              ? "Preparing your order…"
              : mode === "demo"
                ? "Place demo order"
                : payment === "razorpay"
                  ? "Place order and pay"
                  : "Place order"}
            <ArrowRight size={17} />
          </button>
          <Link to="/bag" className="text-link small">
            <ArrowLeft size={14} />
            Edit your bag
          </Link>
        </Summary>
      </form>
    </div>
  );
}

export const Status = ({ value }) => (
  <span className={"order-status " + value}>{value.replaceAll("_", " ")}</span>
);
export function Account() {
  const { user, setUser, api, mode, logout } = useStore();
  const [register, setRegister] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [orders, setOrders] = useState([]);
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const next = params.get("next");
  const target =
    next?.startsWith("/") && !next.startsWith("//") ? next : "/account";
  useEffect(() => {
    if (user)
      api("/orders")
        .then(setOrders)
        .catch((e) => setError(e.message));
  }, [user, api]);
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    try {
      const body = {
        email: fd.get("email"),
        password: fd.get("password"),
        ...(register ? { name: fd.get("name") } : {}),
      };
      const { user } = await api(register ? "/auth/register" : "/auth/login", {
        method: "POST",
        body,
      });
      setUser(user);
      navigate(target);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function enterDemo(role) {
    const { user } = await api("/auth/demo", {
      method: "POST",
      body: { role },
    });
    setUser(user);
    navigate(role === "admin" ? "/admin" : target);
  }
  if (!user)
    return (
      <section className="auth-layout">
        <div className="auth-art">
          <img src="/images/hero.png" alt="A refined Aurel timepiece" />
          <div>
            <p className="eyebrow">YOUR NEXT CHAPTER</p>
            <h2>
              Good to
              <br />
              have you here.
            </h2>
          </div>
        </div>
        <div className="auth-card">
          <p className="eyebrow">THE AUREL CIRCLE</p>
          <h1>{register ? "Make yourself at home." : "Welcome back."}</h1>
          <p className="subtle">
            Your saved pieces. Your orders. Your own sense of time.
          </p>
          {mode === "demo" ? (
            <div className="demo-auth">
              <div className="notice">
                This is a browser-only preview. Choose a sample role to explore.
                No password or real personal information is needed.
              </div>
              <button
                className="button full"
                onClick={() => enterDemo("customer")}
              >
                Enter as demo customer
                <ArrowRight size={17} />
              </button>
              <button
                className="button secondary full"
                onClick={() => enterDemo("admin")}
              >
                Preview store administration
              </button>
            </div>
          ) : (
            <form onSubmit={submit}>
              {register && (
                <label>
                  Your name
                  <input
                    name="name"
                    required
                    minLength={2}
                    maxLength={80}
                    autoComplete="name"
                  />
                </label>
              )}
              <label>
                Email address
                <input
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                />
              </label>
              <label>
                Password
                <input
                  name="password"
                  type="password"
                  required
                  minLength={register ? 12 : 1}
                  maxLength={128}
                  autoComplete={register ? "new-password" : "current-password"}
                />
                {register && <small>At least 12 characters.</small>}
              </label>
              {error && (
                <div className="error" role="alert">
                  {error}
                </div>
              )}
              <button className="button full" disabled={busy}>
                {busy
                  ? "One moment…"
                  : register
                    ? "Create your account"
                    : "Sign in"}
                <ArrowRight size={17} />
              </button>
              <p className="auth-switch">
                {register ? "Already part of the circle?" : "New to AUREL?"}{" "}
                <button
                  type="button"
                  onClick={() => {
                    setRegister(!register);
                    setError("");
                  }}
                >
                  {register ? "Sign in" : "Create an account"}
                </button>
              </p>
            </form>
          )}
        </div>
      </section>
    );
  return (
    <div className="page">
      <div className="account-heading">
        <div>
          <p className="eyebrow">YOUR PERSONAL SPACE</p>
          <h1>Hello, {user.name.split(" ")[0]}.</h1>
          <p>{user.email}</p>
        </div>
        <div className="row-actions">
          {user.role === "admin" && (
            <Link className="button secondary" to="/admin">
              Manage store
            </Link>
          )}
          <button className="text-link" onClick={logout}>
            <LogOut size={16} />
            Sign out
          </button>
        </div>
      </div>
      <div className="account-shortcuts">
        <Link to="/wishlist">
          Your saved collection
          <ArrowUpRightSmall />
        </Link>
        <Link to="/shop">
          Find your next timepiece
          <ArrowUpRightSmall />
        </Link>
      </div>
      <h2>Your orders</h2>
      {error && (
        <div className="error" role="alert">
          {error}
        </div>
      )}
      {orders.length ? (
        <div className="orders-list">
          {orders.map((o) => (
            <Link to={"/orders/" + o.id} className="order-card" key={o.id}>
              <div>
                <small>
                  {new Date(o.createdAt).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </small>
                <h3>{o.id}</h3>
                <p>
                  {o.items.map((i) => `${i.name} × ${i.quantity}`).join(" · ")}
                </p>
              </div>
              <Status value={o.status} />
              <strong>{money(o.total)}</strong>
              <ArrowRight size={19} />
            </Link>
          ))}
        </div>
      ) : (
        <Empty
          title="Your story starts here."
          description="Once you place an order, all the details will be waiting here."
        />
      )}
    </div>
  );
}
function ArrowUpRightSmall() {
  return <ArrowRight size={18} />;
}
export function OrderDetails() {
  const { id } = useParams();
  const { api, mode, user } = useStore();
  const [order, setOrder] = useState(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function load() {
    setBusy(true);
    try {
      setOrder(await api("/orders/" + id));
      setError("");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    if (user) load();
  }, [id, api, user]);
  if (!user)
    return (
      <Empty
        title="Your order is in your account."
        description="Sign in to view its details."
        link={"/account?next=/orders/" + id}
        label="Sign in"
      />
    );
  if (!order)
    return (
      <div className="page">
        <p role="alert">{error || "Loading your order…"}</p>
        <Link className="text-link" to="/account">
          Back to your account
        </Link>
      </div>
    );
  const steps = ["confirmed", "processing", "shipped", "delivered"];
  return (
    <div className="page receipt">
      <Breadcrumb>
        <Link to="/account">Your account</Link>
        <span>/</span>
        {order.id}
      </Breadcrumb>
      <div className="confirmation">
        <span className="confirmation-icon">
          {order.status === "awaiting_payment" ? (
            <LockKeyhole size={28} />
          ) : (
            <Check size={30} />
          )}
        </span>
        <p className="eyebrow">
          {mode === "demo" ? "DEMO ORDER SAVED" : "YOUR AUREL ORDER"}
        </p>
        <h1>
          {order.status === "cancelled"
            ? "This order was cancelled."
            : order.status === "awaiting_payment"
              ? "A moment to complete payment."
              : "A beautiful choice."}
        </h1>
        <p>
          {order.status === "awaiting_payment"
            ? "Payment confirmation is received securely from Razorpay. Your stock is reserved until you pay or the order is cancelled."
            : "Your order details are below. Follow its progress here, at your own pace."}
        </p>
        <strong>{order.id}</strong>
      </div>
      {mode === "demo" && (
        <div className="notice">
          Preview only. No real purchase or shipment will be made.
        </div>
      )}
      {error && (
        <div className="error" role="alert">
          {error}
        </div>
      )}
      <div className="order-topline">
        <Status value={order.status} />
        <span>{new Date(order.createdAt).toLocaleString("en-IN")}</span>
        <button className="text-link" disabled={busy} onClick={load}>
          <RefreshCw size={15} />
          Refresh status
        </button>
        <button
          className="text-link print-button"
          onClick={() => window.print()}
        >
          <Printer size={16} />
          Print receipt
        </button>
      </div>
      {steps.includes(order.status) && (
        <ol className="order-progress">
          {steps.map((s, i) => (
            <li
              className={i <= steps.indexOf(order.status) ? "complete" : ""}
              key={s}
            >
              <span>
                {i < steps.indexOf(order.status) ? <Check size={15} /> : i + 1}
              </span>
              {s}
            </li>
          ))}
        </ol>
      )}
      <div className="commerce-layout">
        <div>
          {order.items.map((i) => (
            <div className="receipt-item" key={i.id}>
              <img src={i.image} alt={i.name} />
              <div>
                <h3>{i.name}</h3>
                <p>
                  {i.quantity} × {money(i.price)}
                </p>
              </div>
              <strong>{money(i.price * i.quantity)}</strong>
            </div>
          ))}
          <div className="delivery-info">
            <div>
              <p className="eyebrow">DELIVER TO</p>
              <strong>{order.address.name}</strong>
              <p>
                {order.address.line1}
                <br />
                {order.address.city}, {order.address.state}
                <br />
                {order.address.postalCode}, India
                <br />
                {order.address.phone}
              </p>
            </div>
            <div>
              <p className="eyebrow">PAYMENT</p>
              <strong>
                {order.paymentMethod === "cod"
                  ? "Cash on delivery"
                  : "Razorpay"}
              </strong>
              <p>
                {order.paymentStatus === "paid"
                  ? "Paid"
                  : order.paymentMethod === "cod"
                    ? "To be collected on delivery"
                    : "Awaiting payment confirmation"}
              </p>
              {order.status === "awaiting_payment" && (
                <button
                  className="button secondary"
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    try {
                      const r = await api("/orders/" + id + "/resume", {
                        method: "POST",
                        body: {},
                      });
                      setOrder(await pay(api, id, r.razorpay));
                      setError("");
                    } catch (e) {
                      setError(e.message);
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  Resume payment
                  <ArrowRight size={15} />
                </button>
              )}
            </div>
          </div>
        </div>
        <aside className="order-summary">
          <h2>Order total</h2>
          <div className="summary-lines">
            <div>
              <span>Subtotal</span>
              <span>{money(order.subtotal)}</span>
            </div>
            {order.discount > 0 && (
              <div>
                <span>Discount</span>
                <span>−{money(order.discount)}</span>
              </div>
            )}
            <div>
              <span>Delivery</span>
              <span>
                {order.shipping ? money(order.shipping) : "Complimentary"}
              </span>
            </div>
            <div className="summary-total">
              <strong>Total</strong>
              <strong>{money(order.total)}</strong>
            </div>
          </div>
          <Link className="button full" to="/account">
            Your account
            <ArrowRight size={17} />
          </Link>
        </aside>
      </div>
    </div>
  );
}
