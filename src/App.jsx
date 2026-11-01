import React, { useState, useEffect } from "react";
import {
  Routes,
  Route,
  Link,
  NavLink,
  useLocation,
  useNavigate,
} from "react-router-dom";
import {
  Search,
  UserRound,
  Heart,
  ShoppingBag,
  Menu,
  X,
  ArrowRight,
  ArrowUpRight,
  ShieldCheck,
  Truck,
  Watch,
  ChevronRight,
} from "lucide-react";
import { useStore } from "./store";
import { resetDemo } from "./api";
import {
  Home,
  Shop,
  Product,
  Wishlist,
  Story,
  Journal,
  Help,
} from "./Storefront";
import { Bag, Checkout, Account, OrderDetails } from "./Commerce";
import { Admin } from "./Admin";

function Header() {
  const { cart, user, mode } = useStore();
  const [menu, setMenu] = useState(false),
    [search, setSearch] = useState(false);
  const location = useLocation(),
    navigate = useNavigate();
  useEffect(() => {
    setMenu(false);
    setSearch(false);
  }, [location.pathname]);
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <div className="announcement">
        <span>TIME, BEAUTIFULLY CONSIDERED.</span>
        <span>
          Complimentary delivery on orders over ₹10,000{" "}
          <ArrowUpRight size={13} />
        </span>
        <span>INDIA / INR ₹</span>
      </div>
      <header className="header">
        <div className="header-inner">
          <button
            className="icon-button mobile-toggle"
            aria-label={menu ? "Close navigation" : "Open navigation"}
            onClick={() => setMenu(!menu)}
          >
            {menu ? <X /> : <Menu />}
          </button>
          <Link to="/" className="wordmark" aria-label="Aurel home">
            AUREL<span>FINE TIMEPIECES</span>
          </Link>
          <nav
            className={menu ? "nav open" : "nav"}
            aria-label="Main navigation"
          >
            <NavLink to="/" end>
              Home
            </NavLink>
            <NavLink to="/shop">The collection</NavLink>
            <NavLink to="/story">Our philosophy</NavLink>
            <NavLink to="/journal">The journal</NavLink>
            <NavLink className="mobile-nav-account" to="/account">
              My account
            </NavLink>
          </nav>
          <div className="header-actions">
            <button
              className="icon-button"
              aria-label="Search watches"
              aria-expanded={search}
              onClick={() => setSearch(!search)}
            >
              {search ? <X size={20} /> : <Search size={20} />}
            </button>
            <Link
              className="icon-button account-icon"
              to="/account"
              aria-label="My account"
            >
              <UserRound size={20} />
            </Link>
            <Link
              className="icon-button"
              to="/wishlist"
              aria-label="Saved watches"
            >
              <Heart size={20} />
            </Link>
            <Link
              className="icon-button bag-icon"
              to="/bag"
              aria-label={`Shopping bag, ${cart.reduce((a, i) => a + i.quantity, 0)} items`}
            >
              <ShoppingBag size={20} />
              <span>{cart.reduce((a, i) => a + i.quantity, 0)}</span>
            </Link>
          </div>
        </div>
        {search && (
          <form
            className="search-dropdown"
            onSubmit={(e) => {
              e.preventDefault();
              navigate(
                "/shop?q=" +
                  encodeURIComponent(
                    new FormData(e.currentTarget).get("search"),
                  ),
              );
              setSearch(false);
            }}
          >
            <Search size={20} />
            <input
              autoFocus
              name="search"
              aria-label="Search by watch name or style"
              placeholder="Find your next timepiece…"
            />
            <button className="text-link">
              Search <ArrowRight size={16} />
            </button>
          </form>
        )}
      </header>
      <div className="mode-bar">
        {mode === "demo" ? (
          <>
            <span className="status-dot" />
            Demo showroom · sample orders stay in this browser{" "}
            <Link to="/account">
              Try an account <ArrowRight size={12} />
            </Link>
          </>
        ) : (
          <>
            <span className="status-dot" />
            Online boutique · secure account & order management{" "}
            {user?.role === "admin" && (
              <Link to="/admin">
                Manage store <ArrowRight size={12} />
              </Link>
            )}
          </>
        )}
      </div>
    </>
  );
}
export function Benefits() {
  return (
    <section className="benefits">
      <div>
        <Truck size={23} strokeWidth={1.3} />
        <span>
          <strong>Beautifully delivered</strong>
          <small>Complimentary above ₹10,000</small>
        </span>
      </div>
      <div>
        <Watch size={23} strokeWidth={1.3} />
        <span>
          <strong>Details that matter</strong>
          <small>Considered, inside and out</small>
        </span>
      </div>
      <div>
        <ShieldCheck size={23} strokeWidth={1.3} />
        <span>
          <strong>A confident choice</strong>
          <small>Transparent pricing. Secure checkout.</small>
        </span>
      </div>
    </section>
  );
}
function Footer() {
  const { api, notify, mode } = useStore();
  const [busy, setBusy] = useState(false);
  async function subscribe(e) {
    e.preventDefault();
    setBusy(true);
    const form = e.currentTarget;
    try {
      await api("/newsletter", {
        method: "POST",
        body: { email: new FormData(form).get("email"), consent: true },
      });
      notify(
        mode === "demo"
          ? "Preview subscription saved in this browser."
          : "You are on the list. Thank you for joining AUREL.",
      );
      form.reset();
    } catch (e) {
      notify(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <footer>
      <div className="newsletter">
        <div>
          <p className="eyebrow">THE AUREL EDIT</p>
          <h2>A little time, well spent.</h2>
          <p>New perspectives, thoughtful stories, and collection updates.</p>
        </div>
        <form onSubmit={subscribe}>
          <div className="email-field">
            <input
              name="email"
              type="email"
              required
              aria-label="Email address for newsletter"
              placeholder="Your email address"
            />
            <button disabled={busy} aria-label="Join the Aurel newsletter">
              <ArrowRight size={22} />
            </button>
          </div>
          <label className="consent">
            <input type="checkbox" required /> I agree to receive collection
            updates. <Link to="/help/privacy">Privacy</Link>
          </label>
        </form>
      </div>
      <div className="footer-main">
        <div>
          <Link to="/" className="wordmark">
            AUREL<span>FINE TIMEPIECES</span>
          </Link>
          <p>
            For the moments that make a life.
            <br />
            And the timepieces that keep them.
          </p>
        </div>
        <div>
          <h4>EXPLORE</h4>
          <Link to="/shop">All timepieces</Link>
          <Link to="/shop?collection=Automatic">Automatic watches</Link>
          <Link to="/shop?collection=Dress">Dress watches</Link>
          <Link to="/wishlist">Your saved collection</Link>
        </div>
        <div>
          <h4>AT YOUR SERVICE</h4>
          <Link to="/account">Account & orders</Link>
          <Link to="/help/delivery">Delivery & returns</Link>
          <Link to="/help/care">Watch care</Link>
          <Link to="/help/faq">Frequently asked questions</Link>
        </div>
        <div>
          <h4>THE HOUSE</h4>
          <Link to="/story">Our philosophy</Link>
          <Link to="/journal">The journal</Link>
          <Link to="/help/privacy">Privacy & terms</Link>
          <Link to="/admin">Store administration</Link>
        </div>
      </div>
      <div className="footer-bottom">
        <span>
          © {new Date().getFullYear()} AUREL. A concept watch boutique.
        </span>
        <span>DESIGNED TO BE TIMELESS.</span>
        {mode === "demo" && (
          <button
            onClick={() => {
              if (
                confirm(
                  "Reset sample orders, products and bag in this browser?",
                )
              )
                resetDemo();
            }}
          >
            Reset demo
          </button>
        )}
      </div>
    </footer>
  );
}
export function Empty({
  title,
  description,
  link = "/shop",
  label = "Explore the collection",
}) {
  return (
    <section className="empty">
      <Watch size={40} strokeWidth={1} />
      <h2>{title}</h2>
      <p>{description}</p>
      <Link className="button" to={link}>
        {label}
        <ArrowRight size={17} />
      </Link>
    </section>
  );
}
export function Breadcrumb({ children }) {
  return (
    <div className="breadcrumb">
      <Link to="/">Home</Link>
      <ChevronRight size={12} />
      {children}
    </div>
  );
}
function NotFound() {
  return (
    <Empty
      title="A moment out of place."
      description="We couldn’t find that page. A beautiful collection is still waiting."
    />
  );
}
export default function App() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [pathname]);
  return (
    <>
      <Header />
      <main id="main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/product/:id" element={<Product />} />
          <Route path="/wishlist" element={<Wishlist />} />
          <Route path="/bag" element={<Bag />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/account" element={<Account />} />
          <Route path="/orders/:id" element={<OrderDetails />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/story" element={<Story />} />
          <Route path="/journal" element={<Journal />} />
          <Route path="/journal/:slug" element={<Journal />} />
          <Route path="/help/:topic" element={<Help />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
    </>
  );
}
