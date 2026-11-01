import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { bootMode, client, readLocal, writeLocal } from "./api";
const Context = createContext();
export const useStore = () => useContext(Context);
export function StoreProvider({ children }) {
  const [config, setConfig] = useState(null),
    [ready, setReady] = useState(false),
    [error, setError] = useState(""),
    [products, setProducts] = useState([]),
    [user, setUser] = useState(null),
    [cart, setCart] = useState([]),
    [wishlist, setWishlist] = useState([]),
    [toast, setToast] = useState("");
  const api = useMemo(() => (config ? client(config.mode) : null), [config]);
  useEffect(() => {
    let active = true;
    bootMode()
      .then((c) => {
        if (active) setConfig(c);
      })
      .catch((e) => setError(e.message));
    return () => {
      active = false;
    };
  }, []);
  const notify = useCallback((message) => setToast(message), []);
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(""), 4000);
      return () => clearTimeout(t);
    }
  }, [toast]);
  const reloadProducts = useCallback(async () => {
    if (api) setProducts(await api("/products"));
  }, [api]);
  useEffect(() => {
    if (!api) return;
    Promise.all([api("/products"), api("/auth/me")])
      .then(([p, a]) => {
        setProducts(p);
        setUser(a.user);
        setReady(true);
      })
      .catch((e) => setError(e.message));
    setCart(readLocal("aurel-bag-" + config.mode, []));
  }, [api, config]);
  useEffect(() => {
    if (config) writeLocal("aurel-bag-" + config.mode, cart);
  }, [cart, config]);
  useEffect(() => {
    if (!api) return;
    let active = true;
    if (user)
      api("/wishlist")
        .then((ids) => {
          if (active) setWishlist(ids);
        })
        .catch((e) => notify(e.message));
    else setWishlist(readLocal("aurel-saved-guest", []));
    return () => {
      active = false;
    };
  }, [api, user, notify]);
  function addToCart(product, quantity = 1) {
    if (product.stock < 1) return notify("This watch is currently sold out.");
    const existing = cart.find((item) => item.id === product.id);
    if ((existing?.quantity || 0) >= Math.min(5, product.stock)) {
      return notify(
        "Your bag already contains the maximum available quantity.",
      );
    }
    setCart((current) => {
      const old = current.find((i) => i.id === product.id);
      const count = Math.min(5, product.stock, (old?.quantity || 0) + quantity);
      return old
        ? current.map((i) =>
            i.id === product.id ? { ...i, quantity: count } : i,
          )
        : [...current, { id: product.id, quantity: count }];
    });
    notify(`${product.name} added to your bag.`);
  }
  function updateCart(id, quantity) {
    setCart((items) =>
      quantity < 1
        ? items.filter((i) => i.id !== id)
        : items.map((i) =>
            i.id === id ? { ...i, quantity: Math.min(5, quantity) } : i,
          ),
    );
  }
  async function toggleWishlist(id) {
    const next = wishlist.includes(id)
      ? wishlist.filter((x) => x !== id)
      : [...wishlist, id];
    try {
      if (user) await api("/wishlist", { method: "PUT", body: { ids: next } });
      else writeLocal("aurel-saved-guest", next);
      setWishlist(next);
    } catch (e) {
      notify(e.message);
    }
  }
  async function logout() {
    try {
      await api("/auth/logout", { method: "POST", body: {} });
      setUser(null);
      notify("You have signed out.");
    } catch (e) {
      notify(e.message);
    }
  }
  const cartItems = cart.map((i) => {
    const p = products.find((p) => p.id === i.id);
    return p
      ? { ...p, quantity: i.quantity }
      : {
          ...i,
          name: "Unavailable watch",
          price: 0,
          stock: 0,
          image: "/images/verde.png",
        };
  });
  if (error)
    return (
      <div className="boot">
        <h1>Let’s get the store connected.</h1>
        <p>{error}</p>
        <button className="button" onClick={() => location.reload()}>
          Try again
        </button>
      </div>
    );
  if (!config || !ready)
    return (
      <div className="boot">
        <span className="wordmark">AUREL</span>
        <div className="loading-line" />
        <p>Good things take a moment.</p>
      </div>
    );
  return (
    <Context.Provider
      value={{
        ...config,
        api,
        products,
        reloadProducts,
        user,
        setUser,
        cart,
        cartItems,
        setCart,
        addToCart,
        updateCart,
        wishlist,
        toggleWishlist,
        notify,
        logout,
      }}
    >
      {children}
      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </Context.Provider>
  );
}
