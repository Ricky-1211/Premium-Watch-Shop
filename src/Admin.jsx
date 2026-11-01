import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  Plus,
  Package,
  Users,
  IndianRupee,
  TriangleAlert,
  Pencil,
  Download,
  X,
  RefreshCw,
} from "lucide-react";
import { useStore } from "./store";
import { money } from "../shared/catalog";
import { Empty } from "./App";
import { Status } from "./Commerce";
const blank = {
  name: "",
  collection: "Automatic",
  price: 1990000,
  stock: 10,
  image: "/images/verde.png",
  description: "",
  color: "Forest green",
  strap: "Stainless steel",
  movement: "Automatic",
  size: "40 mm",
  water: "100 m",
  reserve: "40 hours",
  badge: "NEW ARRIVAL",
  featured: false,
  active: true,
};
const fields = [
  "name",
  "collection",
  "price",
  "stock",
  "image",
  "description",
  "color",
  "strap",
  "movement",
  "size",
  "water",
  "reserve",
  "badge",
  "featured",
  "active",
];
export function Admin() {
  const { user, api, mode, reloadProducts, notify } = useStore();
  const [data, setData] = useState(null),
    [tab, setTab] = useState("Overview"),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [editing, setEditing] = useState(null),
    [query, setQuery] = useState("");
  const dialog = useRef();
  async function load() {
    try {
      setData(await api("/admin/summary"));
      setError("");
    } catch (e) {
      setError(e.message);
    }
  }
  useEffect(() => {
    if (user?.role === "admin") load();
  }, [user, api]);
  useEffect(() => {
    if (editing) dialog.current?.showModal();
  }, [editing]);
  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    const body = Object.fromEntries(
      fields.map((k) => [
        k,
        k === "price"
          ? Math.round(Number(fd.get(k)) * 100)
          : k === "stock"
            ? Number(fd.get(k))
            : k === "featured" || k === "active"
              ? fd.has(k)
              : fd.get(k),
      ]),
    );
    try {
      await api("/admin/products" + (editing.id ? "/" + editing.id : ""), {
        method: editing.id ? "PUT" : "POST",
        body,
        headers: editing.id ? { "If-Stock": String(editing.stock) } : {},
      });
      dialog.current.close();
      setEditing(null);
      await load();
      await reloadProducts();
      notify("Product saved.");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function changeStatus(id, status) {
    setBusy(true);
    try {
      await api("/admin/orders/" + id, { method: "PATCH", body: { status } });
      await load();
      await reloadProducts();
      notify("Order status updated.");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  function exportOrders() {
    const safe = (v) =>
      '"' +
      String(v ?? "")
        .replace(/^[=+@\-\t\r]/, "'$&")
        .replaceAll('"', '""') +
      '"';
    const rows = [
      [
        "Order ID",
        "Date",
        "Customer",
        "Email",
        "Total INR",
        "Status",
        "Payment",
      ],
      ...data.orders.map((o) => [
        o.id,
        new Date(o.createdAt).toISOString(),
        o.address.name,
        o.email,
        (o.total / 100).toFixed(2),
        o.status,
        o.paymentStatus,
      ]),
    ];
    const url = URL.createObjectURL(
      new Blob(
        ["\uFEFF" + rows.map((r) => r.map(safe).join(",")).join("\r\n")],
        { type: "text/csv;charset=utf-8" },
      ),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "aurel-orders.csv";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  if (!user)
    return (
      <Empty
        title="The store, behind the scenes."
        description="Sign in with an administrator account to continue."
        link="/account?next=/admin"
        label="Sign in to administration"
      />
    );
  if (user.role !== "admin")
    return (
      <Empty
        title="This space is for the store team."
        description="Your customer account does not have administrator permissions."
        link="/account"
        label="Return to your account"
      />
    );
  const orders =
    data?.orders.filter((o) =>
      `${o.id} ${o.address.name} ${o.email} ${o.status}`
        .toLowerCase()
        .includes(query.toLowerCase()),
    ) || [];
  return (
    <div className="page admin-page">
      <div className="account-heading">
        <div>
          <p className="eyebrow">AUREL / STORE ADMINISTRATION</p>
          <h1>A considered overview.</h1>
          <p>
            {mode === "demo"
              ? "Sample data in this browser. Changes do not affect a live store."
              : "Your products, orders and customers — in one place."}
          </p>
        </div>
        <Link className="text-link" to="/">
          View storefront
          <ArrowUpRight size={17} />
        </Link>
      </div>
      <div className="admin-tabs">
        {["Overview", "Orders", "Products", "Activity"].map((t) => (
          <button
            className={tab === t ? "active" : ""}
            onClick={() => setTab(t)}
            key={t}
          >
            {t}
          </button>
        ))}
        <button onClick={load} aria-label="Refresh admin data">
          <RefreshCw size={16} />
        </button>
      </div>
      {error && !editing && (
        <div className="error" role="alert">
          {error}
        </div>
      )}
      {!data ? (
        <p>Loading your store…</p>
      ) : (
        <>
          {tab === "Overview" && (
            <>
              <div className="stat-grid">
                {[
                  [IndianRupee, "Collected revenue", money(data.stats.revenue)],
                  [Package, "Total orders", data.stats.orders],
                  [Users, "Customer accounts", data.stats.customers],
                  [TriangleAlert, "Low-stock products", data.stats.lowStock],
                ].map(([Icon, label, value]) => (
                  <div className="stat" key={label}>
                    <Icon size={22} strokeWidth={1.3} />
                    <small>{label}</small>
                    <strong>{value}</strong>
                  </div>
                ))}
              </div>
              <div className="section-heading">
                <h2>Recent orders</h2>
                <button className="text-link" onClick={() => setTab("Orders")}>
                  All orders
                  <ArrowUpRight size={16} />
                </button>
              </div>
              {!data.orders.length ? (
                <div className="admin-empty">
                  <Package size={30} />
                  <h3>Ready for your first order.</h3>
                  <p>Orders placed through the storefront will appear here.</p>
                </div>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>ORDER</th>
                        <th>CUSTOMER</th>
                        <th>TOTAL</th>
                        <th>STATUS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.orders.slice(0, 6).map((o) => (
                        <tr key={o.id}>
                          <td>
                            {o.id}
                            <small>
                              {new Date(o.createdAt).toLocaleDateString(
                                "en-IN",
                              )}
                            </small>
                          </td>
                          <td>{o.address.name}</td>
                          <td>{money(o.total)}</td>
                          <td>
                            <Status value={o.status} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <div className="admin-note">
                <ShieldNote />
                <div>
                  <strong>Revenue is counted when payment is collected.</strong>
                  <p>
                    Cash-on-delivery orders become paid when marked delivered.
                    Razorpay orders become paid only after the server verifies
                    the signature and the captured amount.
                  </p>
                </div>
              </div>
            </>
          )}
          {tab === "Orders" && (
            <>
              <div className="admin-toolbar">
                <h2>Order management</h2>
                <input
                  aria-label="Search orders"
                  placeholder="Search orders or customers"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                <button
                  className="button secondary small-button"
                  onClick={exportOrders}
                >
                  <Download size={16} />
                  Export CSV
                </button>
              </div>
              <p className="subtle">
                The latest 500 orders are shown. Card order cancellations and
                refunds require payment-provider reconciliation.
              </p>
              {orders.length ? (
                <div className="admin-orders">
                  {orders.map((o) => (
                    <article className="admin-order" key={o.id}>
                      <div className="admin-order-head">
                        <div>
                          <strong>{o.id}</strong>
                          <small>
                            {new Date(o.createdAt).toLocaleString("en-IN")}
                          </small>
                        </div>
                        <Status value={o.status} />
                        <strong>{money(o.total)}</strong>
                        <select
                          aria-label={"Update status for " + o.id}
                          value=""
                          disabled={busy}
                          onChange={(e) => {
                            if (e.target.value)
                              changeStatus(o.id, e.target.value);
                          }}
                        >
                          <option value="">Update status…</option>
                          {(
                            {
                              confirmed: [
                                "processing",
                                ...(o.paymentMethod === "cod"
                                  ? ["cancelled"]
                                  : []),
                              ],
                              processing: [
                                "shipped",
                                ...(o.paymentMethod === "cod"
                                  ? ["cancelled"]
                                  : []),
                              ],
                              shipped: ["delivered"],
                            }[o.status] || []
                          ).map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </div>
                      <details>
                        <summary>
                          {o.address.name} ·{" "}
                          {o.items.reduce((a, i) => a + i.quantity, 0)} item(s)
                          · View delivery & items
                        </summary>
                        <div className="delivery-info">
                          <div>
                            <strong>{o.address.name}</strong>
                            <p>
                              {o.email}
                              <br />
                              {o.address.phone}
                              <br />
                              {o.address.line1}
                              <br />
                              {o.address.city}, {o.address.state}{" "}
                              {o.address.postalCode}
                            </p>
                          </div>
                          <div>
                            {o.items.map((i) => (
                              <p key={i.id}>
                                {i.name} × {i.quantity} —{" "}
                                {money(i.price * i.quantity)}
                              </p>
                            ))}
                            <p>
                              {o.paymentMethod.toUpperCase()} ·{" "}
                              {o.paymentStatus}
                            </p>
                          </div>
                        </div>
                      </details>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="admin-empty">No orders match your search.</div>
              )}
            </>
          )}
          {tab === "Products" && (
            <>
              <div className="admin-toolbar">
                <h2>Your timepieces</h2>
                <button
                  className="button small-button"
                  onClick={() => {
                    setError("");
                    setEditing({ ...blank });
                  }}
                >
                  <Plus size={16} />
                  Add a product
                </button>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>PRODUCT</th>
                      <th>COLLECTION</th>
                      <th>PRICE</th>
                      <th>STOCK</th>
                      <th>VISIBILITY</th>
                      <th>EDIT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.products.map((p) => (
                      <tr key={p.id}>
                        <td>
                          <div className="table-product">
                            <img src={p.image} alt="" />
                            <span>
                              {p.name}
                              <small>{p.color}</small>
                            </span>
                          </div>
                        </td>
                        <td>{p.collection}</td>
                        <td>{money(p.price)}</td>
                        <td className={p.stock < 5 ? "error-text" : ""}>
                          {p.stock}
                        </td>
                        <td>{p.active ? "Visible" : "Archived"}</td>
                        <td>
                          <button
                            className="icon-button"
                            aria-label={"Edit " + p.name}
                            onClick={() => {
                              setError("");
                              setEditing({ ...p });
                            }}
                          >
                            <Pencil size={17} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
          {tab === "Activity" && (
            <>
              <h2>Recent administrator activity</h2>
              <p className="subtle">
                The latest 30 events. Product changes and order transitions are
                recorded by the backend.
              </p>
              {data.audit.length ? (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>TIME</th>
                        <th>ACTION</th>
                        <th>TARGET</th>
                        <th>ACTOR</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.audit.map((a) => (
                        <tr key={a.id}>
                          <td>
                            {new Date(Number(a.created_at)).toLocaleString(
                              "en-IN",
                            )}
                          </td>
                          <td>{a.action}</td>
                          <td>{a.target_id}</td>
                          <td className="mono-small">{a.actor_id}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="admin-empty">
                  {mode === "demo"
                    ? "Persistent audit logging is available in live mode."
                    : "No administrative changes have been made yet."}
                </div>
              )}
            </>
          )}
        </>
      )}
      <dialog
        className="product-editor"
        ref={dialog}
        onClose={() => {
          setEditing(null);
          setError("");
        }}
      >
        {editing && (
          <>
            <div className="editor-heading">
              <h2>{editing.id ? "Edit timepiece" : "A new timepiece"}</h2>
              <button
                className="icon-button"
                aria-label="Close product editor"
                onClick={() => dialog.current.close()}
              >
                <X />
              </button>
            </div>
            <form onSubmit={save}>
              <div className="form-grid">
                <label className="wide">
                  Product name
                  <input
                    name="name"
                    required
                    minLength={2}
                    maxLength={80}
                    defaultValue={editing.name}
                  />
                </label>
                <label>
                  Collection
                  <select name="collection" defaultValue={editing.collection}>
                    {["Automatic", "Dress", "Chronograph", "Dive"].map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Price in INR
                  <input
                    name="price"
                    type="number"
                    min={1}
                    max={1000000}
                    step="0.01"
                    required
                    defaultValue={editing.price / 100}
                  />
                </label>
                <label>
                  Stock quantity
                  <input
                    name="stock"
                    type="number"
                    min={0}
                    max={100000}
                    step="1"
                    required
                    defaultValue={editing.stock}
                  />
                </label>
                <label>
                  Badge
                  <input
                    name="badge"
                    maxLength={40}
                    defaultValue={editing.badge}
                  />
                </label>
                <label className="wide">
                  Image path or HTTPS URL
                  <input
                    name="image"
                    required
                    maxLength={600}
                    defaultValue={editing.image}
                  />
                  <small>
                    Bundled: /images/verde.png, oro.png, noir.png, bleu.png
                  </small>
                </label>
                <label className="wide">
                  Description
                  <textarea
                    name="description"
                    required
                    minLength={10}
                    maxLength={1500}
                    rows={3}
                    defaultValue={editing.description}
                  />
                </label>
                {[
                  ["color", "Dial colour"],
                  ["strap", "Strap"],
                  ["movement", "Movement"],
                  ["size", "Case size"],
                  ["water", "Water resistance"],
                  ["reserve", "Power reserve"],
                ].map(([key, label]) => (
                  <label key={key}>
                    {label}
                    <input
                      name={key}
                      required
                      maxLength={
                        key === "size" || key === "water"
                          ? 30
                          : key === "color" || key === "reserve"
                            ? 50
                            : 80
                      }
                      defaultValue={editing[key]}
                    />
                  </label>
                ))}
                <label className="checkbox">
                  <input
                    type="checkbox"
                    name="featured"
                    defaultChecked={editing.featured}
                  />
                  Featured on home
                </label>
                <label className="checkbox">
                  <input
                    type="checkbox"
                    name="active"
                    defaultChecked={editing.active}
                  />
                  Visible in store
                </label>
              </div>
              {error && (
                <div className="error" role="alert">
                  {error}
                </div>
              )}
              <div className="editor-actions">
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => dialog.current.close()}
                >
                  Cancel
                </button>
                <button className="button" disabled={busy}>
                  {busy ? "Saving…" : "Save product"}
                </button>
              </div>
            </form>
          </>
        )}
      </dialog>
    </div>
  );
}
function ShieldNote() {
  return <Package size={24} />;
}
