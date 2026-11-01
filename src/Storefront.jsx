import React, { useState, useRef } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  Heart,
  Plus,
  Minus,
  Check,
  SlidersHorizontal,
  Maximize2,
  X,
  ShieldCheck,
  Truck,
  Watch,
  Search,
} from "lucide-react";
import { useStore } from "./store";
import { money, collections } from "../shared/catalog";
import { Benefits, Breadcrumb, Empty } from "./App";

export function ProductCard({ product: p }) {
  const { wishlist, toggleWishlist, addToCart } = useStore();
  return (
    <article className="product-card">
      <div className="product-image">
        <Link to={"/product/" + p.id} aria-label={"Explore " + p.name}>
          <img
            src={p.image}
            alt={`${p.name}, ${p.color} dial with ${p.strap} strap`}
            loading="lazy"
          />
        </Link>
        <span className="product-badge">
          {p.stock === 0 ? "SOLD OUT" : p.badge}
        </span>
        <button
          className={"save-button " + (wishlist.includes(p.id) ? "saved" : "")}
          aria-label={`${wishlist.includes(p.id) ? "Unsave" : "Save"} ${p.name}`}
          aria-pressed={wishlist.includes(p.id)}
          onClick={() => toggleWishlist(p.id)}
        >
          <Heart size={18} />
        </button>
        <button
          disabled={!p.stock}
          className="quick-add"
          onClick={() => addToCart(p)}
        >
          {p.stock ? "Add to bag" : "Sold out"}
          <Plus size={17} />
        </button>
      </div>
      <div className="product-meta">
        <div>
          <small>
            {p.collection.toUpperCase()} · {p.size}
          </small>
          <Link to={"/product/" + p.id}>
            <h3>{p.name}</h3>
          </Link>
          <span>
            {p.color} / {p.strap}
          </span>
        </div>
        <strong>{money(p.price)}</strong>
      </div>
    </article>
  );
}
export function Home() {
  const { products } = useStore();
  const [category, setCategory] = useState("All watches");
  const featured = products.filter(
    (p) =>
      p.featured && (category === "All watches" || p.collection === category),
  );
  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">
            <span />
            THE ART OF KEEPING TIME
          </p>
          <h1>
            Not just time.
            <br />
            <em>A way of life.</em>
          </h1>
          <p className="hero-description">
            Some things are made to last.
            <br />
            Discover timepieces that move with you —
            <br className="desktop-break" /> through the everyday and the
            extraordinary.
          </p>
          <Link className="button" to="/shop">
            Discover the collection
            <ArrowUpRight size={18} />
          </Link>
          <div className="hero-footnote">
            <span className="tiny-clock">◷</span>
            <span>
              CONSIDERED DESIGN.
              <br />
              ENDURING CHARACTER.
            </span>
          </div>
        </div>
        <div className="hero-art">
          <img
            src="/images/hero.png"
            alt="A green dial steel watch on deep olive silk and natural stone"
            fetchPriority="high"
          />
          <div className="hero-caption">
            <div>
              <span>THE SIGNATURE COLLECTION</span>
              <h3>Every second, a statement.</h3>
            </div>
            <Link
              to="/product/verde-automatic"
              aria-label="Discover Verde Automatic"
            >
              <ArrowUpRight size={25} />
            </Link>
          </div>
          <span className="hero-vertical">A NEW PERSPECTIVE ON TIME</span>
        </div>
      </section>
      <Benefits />
      <section className="section collection-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">THE CONSIDERED COLLECTION</p>
            <h2>Find your everyday extraordinary.</h2>
          </div>
          <Link className="text-link" to="/shop">
            View all watches
            <ArrowUpRight size={17} />
          </Link>
        </div>
        <div
          className="collection-tabs"
          role="group"
          aria-label="Featured watch collection"
        >
          {collections.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={category === c ? "active" : ""}
            >
              {c}
            </button>
          ))}
        </div>
        <div className="product-grid">
          {featured.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
        {!featured.length && (
          <p className="subtle">
            New pieces in this collection are coming soon.
          </p>
        )}
      </section>
      <section className="manifesto">
        <div className="manifesto-image">
          <img
            src="/images/oro.png"
            alt="The Oro Classic, a champagne dress watch with a brown leather strap"
            loading="lazy"
          />
          <span>LESS, BUT BETTER.</span>
        </div>
        <div className="manifesto-copy">
          <p className="eyebrow">BEYOND THE DIAL</p>
          <h2>
            Trends pass.
            <br />
            <em>Character stays.</em>
          </h2>
          <p>
            We believe a watch should feel like you. Not louder. Not more
            complicated. Just considered in every detail, from the first glance
            to the way it sits on your wrist.
          </p>
          <Link to="/story" className="text-link">
            Discover our philosophy
            <ArrowUpRight size={18} />
          </Link>
          <div className="signature">The Aurel perspective</div>
        </div>
      </section>
      <section className="section journal-preview">
        <div className="section-heading">
          <div>
            <p className="eyebrow">A MOMENT TO READ</p>
            <h2>The art of wearing time.</h2>
          </div>
          <Link to="/journal" className="text-link">
            The journal
            <ArrowUpRight size={17} />
          </Link>
        </div>
        <div className="journal-grid">
          <Link to="/journal/first-watch" className="journal-card">
            <div className="journal-art dark">
              <img
                src="/images/hero.png"
                alt="Detail of an emerald watch dial"
                loading="lazy"
              />
            </div>
            <small>THE ESSENTIALS · 4 MIN READ</small>
            <h3>
              Choosing your first signature watch.
              <ArrowUpRight size={20} />
            </h3>
          </Link>
          <Link to="/journal/automatic" className="journal-card">
            <div className="journal-art light">
              <img
                src="/images/bleu.png"
                alt="A midnight blue automatic watch"
                loading="lazy"
              />
            </div>
            <small>WATCH KNOWLEDGE · 3 MIN READ</small>
            <h3>
              The quiet wonder of an automatic.
              <ArrowUpRight size={20} />
            </h3>
          </Link>
        </div>
      </section>
    </>
  );
}

export function Shop() {
  const { products } = useStore();
  const [params, setParams] = useSearchParams();
  const [sort, setSort] = useState("featured"),
    [max, setMax] = useState(100000),
    [inStock, setInStock] = useState(false);
  const category = params.get("collection") || "All watches",
    q = params.get("q") || "";
  const visible = products
    .filter(
      (p) =>
        (category === "All watches" || p.collection === category) &&
        `${p.name} ${p.color} ${p.collection} ${p.strap}`
          .toLowerCase()
          .includes(q.toLowerCase()) &&
        p.price <= max * 100 &&
        (!inStock || p.stock > 0),
    )
    .sort((a, b) =>
      sort === "price-low"
        ? a.price - b.price
        : sort === "price-high"
          ? b.price - a.price
          : sort === "name"
            ? a.name.localeCompare(b.name)
            : Number(b.featured) - Number(a.featured),
    );
  function update(k, v) {
    const n = new URLSearchParams(params);
    v ? n.set(k, v) : n.delete(k);
    setParams(n, { replace: true });
  }
  return (
    <div className="page">
      <Breadcrumb>The collection</Breadcrumb>
      <div className="shop-heading">
        <p className="eyebrow">A TIMEPIECE FOR EVERY CHAPTER</p>
        <h1>The collection.</h1>
        <p>Beautifully considered. Distinctly yours.</p>
      </div>
      <div className="shop-toolbar">
        <div className="collection-tabs">
          {collections.map((c) => (
            <button
              className={c === category ? "active" : ""}
              onClick={() => update("collection", c === "All watches" ? "" : c)}
              key={c}
            >
              {c}
            </button>
          ))}
        </div>
        <label className="sort">
          Sort by{" "}
          <select value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="featured">Featured</option>
            <option value="price-low">Price: low to high</option>
            <option value="price-high">Price: high to low</option>
            <option value="name">Name: A to Z</option>
          </select>
        </label>
      </div>
      <div className="filter-row">
        <label className="search-field">
          <Search size={17} />
          <input
            placeholder="Search the collection"
            value={q}
            onChange={(e) => update("q", e.target.value)}
            aria-label="Search the collection"
          />
        </label>
        <label className="price-filter">
          <SlidersHorizontal size={15} />
          Up to {money(max * 100)}
          <input
            aria-label="Maximum price"
            type="range"
            min="10000"
            max="100000"
            step="1000"
            value={max}
            onChange={(e) => setMax(Number(e.target.value))}
          />
        </label>
        <label className="checkbox">
          <input
            type="checkbox"
            checked={inStock}
            onChange={(e) => setInStock(e.target.checked)}
          />
          In stock only
        </label>
        <span className="result-count">
          {visible.length} timepiece{visible.length === 1 ? "" : "s"}
        </span>
      </div>
      <div className="product-grid">
        {visible.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
      {!visible.length && (
        <div className="empty">
          <h2>A different perspective?</h2>
          <p>No timepieces match these filters.</p>
          <button
            className="button"
            onClick={() => {
              setParams({});
              setMax(100000);
              setInStock(false);
            }}
          >
            Clear filters
          </button>
        </div>
      )}
      <Benefits />
    </div>
  );
}

export function Product() {
  const { id } = useParams();
  const { products, addToCart, wishlist, toggleWishlist } = useStore();
  const [qty, setQty] = useState(1);
  const dialog = useRef();
  const p = products.find((p) => p.id === id);
  if (!p)
    return (
      <Empty
        title="This timepiece is unavailable."
        description="Discover the rest of our collection."
      />
    );
  return (
    <div className="page">
      <Breadcrumb>
        <Link to="/shop">The collection</Link>
        <span>/</span>
        {p.name}
      </Breadcrumb>
      <section className="product-detail">
        <div className="detail-photo">
          <img
            src={p.image}
            alt={`${p.name}, ${p.color} dial`}
            fetchPriority="high"
          />
          <span className="product-badge">{p.badge}</span>
          <button
            className="zoom-button icon-button"
            onClick={() => dialog.current.showModal()}
            aria-label="Enlarge watch image"
          >
            <Maximize2 size={21} />
          </button>
        </div>
        <div className="detail-copy">
          <p className="eyebrow">{p.collection.toUpperCase()} COLLECTION</p>
          <h1>{p.name}</h1>
          <p className="detail-subtitle">
            {p.color} dial · {p.size} case · {p.strap}
          </p>
          <div className="detail-price">
            {money(p.price)}
            <span>All taxes included</span>
          </div>
          <p className="description">{p.description}</p>
          <div className="finish">
            <span>THE FINISH</span>
            <div>
              <i
                style={{
                  background:
                    p.color === "Forest green"
                      ? "#284b38"
                      : p.color === "Champagne"
                        ? "#bc965e"
                        : p.color === "Midnight blue"
                          ? "#263f65"
                          : "#282828",
                }}
              />
              {p.color}
              <Check size={15} />
            </div>
          </div>
          <p className={p.stock ? "stock" : "stock sold"}>
            <span className="status-dot" />
            {p.stock
              ? `${p.stock} available · ready for your next chapter`
              : "Currently sold out"}
          </p>
          <div className="purchase-row">
            <div className="quantity">
              <button
                aria-label="Decrease quantity"
                disabled={qty <= 1}
                onClick={() => setQty((q) => q - 1)}
              >
                <Minus size={15} />
              </button>
              <span>{qty}</span>
              <button
                aria-label="Increase quantity"
                disabled={qty >= Math.min(5, p.stock)}
                onClick={() => setQty((q) => q + 1)}
              >
                <Plus size={15} />
              </button>
            </div>
            <button
              className="button"
              disabled={!p.stock}
              onClick={() => addToCart(p, qty)}
            >
              Add to bag
              <ArrowRight size={18} />
            </button>
            <button
              className={
                "icon-button outline " +
                (wishlist.includes(p.id) ? "saved" : "")
              }
              aria-label="Save this watch"
              aria-pressed={wishlist.includes(p.id)}
              onClick={() => toggleWishlist(p.id)}
            >
              <Heart size={20} />
            </button>
          </div>
          <div className="detail-assurances">
            <span>
              <Truck size={16} />
              Complimentary delivery
            </span>
            <span>
              <ShieldCheck size={16} />
              Secure checkout
            </span>
          </div>
          <details open>
            <summary>The finer details</summary>
            <dl className="specs">
              {[
                ["Movement", p.movement],
                ["Case size", p.size],
                ["Dial", p.color],
                ["Strap", p.strap],
                ["Water resistance", p.water],
                ["Power reserve", p.reserve],
              ].map(([k, v]) => (
                <React.Fragment key={k}>
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </React.Fragment>
              ))}
            </dl>
          </details>
          <details>
            <summary>Delivery & care</summary>
            <p>
              Delivery is available to Indian addresses. Your order progress is
              visible in your account. Please review our{" "}
              <Link to="/help/delivery">delivery policy</Link> and{" "}
              <Link to="/help/care">care guide</Link>.
            </p>
          </details>
        </div>
      </section>
      <section className="section related">
        <p className="eyebrow">ANOTHER PERSPECTIVE</p>
        <h2>You may also appreciate.</h2>
        <div className="product-grid">
          {products
            .filter((x) => x.id !== p.id)
            .slice(0, 4)
            .map((x) => (
              <ProductCard key={x.id} product={x} />
            ))}
        </div>
      </section>
      <dialog
        className="image-dialog"
        ref={dialog}
        onClick={(e) => {
          if (e.target === dialog.current) dialog.current.close();
        }}
      >
        <button
          className="icon-button"
          aria-label="Close enlarged image"
          onClick={() => dialog.current.close()}
        >
          <X />
        </button>
        <img src={p.image} alt={p.name + " enlarged"} />
      </dialog>
    </div>
  );
}
export function Wishlist() {
  const { wishlist, products } = useStore();
  const saved = products.filter((p) => wishlist.includes(p.id));
  return (
    <div className="page">
      <Breadcrumb>Your saved collection</Breadcrumb>
      <div className="page-title">
        <p className="eyebrow">A PERSONAL PERSPECTIVE</p>
        <h1>Your saved collection.</h1>
        <p>A little inspiration, for when the time is right.</p>
      </div>
      {saved.length ? (
        <div className="product-grid">
          {saved.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      ) : (
        <Empty
          title="Good taste takes time."
          description="Tap the heart on a watch to keep it here."
        />
      )}
    </div>
  );
}
export function Story() {
  return (
    <>
      <section className="story-hero">
        <img src="/images/hero.png" alt="A refined green watch on olive silk" />
        <div>
          <p className="eyebrow">THE AUREL PHILOSOPHY</p>
          <h1>
            Make room
            <br />
            for the moments.
          </h1>
        </div>
      </section>
      <article className="prose">
        <p className="eyebrow">CONSIDERED. NOT COMPLICATED.</p>
        <h2>A different relationship with time.</h2>
        <p>
          AUREL is a concept boutique built around a simple idea: the objects we
          choose should bring a little intention to our everyday lives. A watch
          is a small reminder to be present — and an expression of the person
          wearing it.
        </p>
        <p>
          Our sample collection explores four distinct personalities. The quiet
          confidence of the Verde. The warmth of the Oro. The sporting clarity
          of the Noir. The sense of possibility in the Bleu.
        </p>
        <h3>Design with breathing room.</h3>
        <p>
          Clear dials, thoughtful proportions, and materials that complement
          each other. We believe the most compelling details are the ones you
          keep discovering.
        </p>
        <h3>A note about this boutique.</h3>
        <p>
          This is an original demonstration store. Product imagery and
          specifications represent a fictional catalog. Before operating it as a
          real business, the store owner must supply verified product details,
          actual stock, business information, and delivery and warranty terms.
        </p>
        <Link className="button" to="/shop">
          Find your perspective
          <ArrowRight size={18} />
        </Link>
      </article>
    </>
  );
}
const articles = {
  "first-watch": {
    title: "Choosing your first signature watch.",
    eyebrow: "THE ESSENTIALS",
    image: "/images/hero.png",
    sections: [
      [
        "Start with your everyday.",
        "Think about the clothes you reach for, the places you spend time, and what feels natural on your wrist. A first watch should complement your routine before it fills a gap in a collection.",
      ],
      [
        "Pay attention to proportion.",
        "Case diameter is only part of the story. Lug-to-lug length, case thickness, and the shape of your wrist all change how a watch wears. If possible, try it on. Comfort is a more useful guide than a universal size rule.",
      ],
      [
        "Choose the character you love.",
        "A restrained dial can transition easily between casual and formal settings. A chronograph has a more sporting presence. A colourful dial can become a signature. There is no single correct choice.",
      ],
      [
        "Let practical details decide.",
        "Consider maintenance, battery changes, strap comfort, and the maker’s verified water-resistance guidance. Look for clear specifications and a seller with transparent delivery and after-sales terms.",
      ],
    ],
  },
  automatic: {
    title: "The quiet wonder of an automatic.",
    eyebrow: "WATCH KNOWLEDGE",
    image: "/images/bleu.png",
    sections: [
      [
        "Motion, made meaningful.",
        "An automatic mechanical watch stores energy in a mainspring. A weighted rotor turns with wrist movement, helping wind that spring. The movement releases the energy through a controlled train of gears.",
      ],
      [
        "A rhythm of its own.",
        "Mechanical watches are appreciated for the engineering inside them, not because they outpace quartz in accuracy. Small daily variations are normal; the acceptable range depends on the specific movement.",
      ],
      [
        "When your watch rests.",
        "A power reserve describes how long the movement can run after it is fully wound. If it stops, follow the manufacturer’s instructions for winding and setting the time. Never force the crown.",
      ],
      [
        "Care for the long term.",
        "Keep your watch away from strong magnetic fields, shocks, and water exposure beyond its documented rating. Follow the maker’s service schedule and have water resistance checked when appropriate.",
      ],
    ],
  },
};
export function Journal() {
  const { slug } = useParams();
  const a = articles[slug];
  if (slug && !a)
    return (
      <Empty
        title="This story is still being written."
        description="Explore the journal for more perspectives."
        link="/journal"
        label="Back to the journal"
      />
    );
  return a ? (
    <>
      <div className="article-heading">
        <p className="eyebrow">{a.eyebrow}</p>
        <h1>{a.title}</h1>
        <Link className="text-link" to="/journal">
          The Aurel journal
        </Link>
      </div>
      <article className="prose">
        {a.sections.map(([t, p]) => (
          <section key={t}>
            <h2>{t}</h2>
            <p>{p}</p>
          </section>
        ))}
        <Link to="/shop" className="button">
          Explore the collection
          <ArrowRight size={17} />
        </Link>
      </article>
    </>
  ) : (
    <div className="page">
      <div className="page-title">
        <p className="eyebrow">PERSPECTIVES ON TIME</p>
        <h1>The journal.</h1>
        <p>Slow down. There’s a story in every detail.</p>
      </div>
      <div className="journal-grid">
        {Object.entries(articles).map(([id, a]) => (
          <Link className="journal-card" to={"/journal/" + id} key={id}>
            <div className="journal-art">
              <img src={a.image} alt="A timepiece from the Aurel collection" />
            </div>
            <small>{a.eyebrow}</small>
            <h3>
              {a.title}
              <ArrowUpRight size={20} />
            </h3>
          </Link>
        ))}
      </div>
    </div>
  );
}
const helpContent = {
  delivery: {
    title: "Delivery & returns",
    sections: [
      [
        "Delivery",
        "The store currently accepts Indian delivery addresses. The configured shipping charge is ₹299 below ₹10,000 after discounts, and complimentary at or above ₹10,000. Prices are inclusive of taxes. Order status is available in your account.",
      ],
      [
        "Returns and fulfilment",
        "This is a demonstration policy, not a commercial promise. Before selling, the owner must publish dispatch times, return eligibility, return address, warranty coverage, and business contact details. No courier integration or automated returns service is connected.",
      ],
    ],
  },
  care: {
    title: "A little care goes a long way.",
    sections: [
      [
        "Keep it clean",
        "Use a soft, dry cloth for routine cleaning. Follow the actual manufacturer’s instructions for water, chemicals, leather conditioning, and bracelet cleaning.",
      ],
      [
        "Protect the movement",
        "Avoid impacts, extreme temperatures, and strong magnets. Do not operate crowns or pushers under water unless the manufacturer explicitly permits it.",
      ],
      [
        "Understand the rating",
        "A depth rating is not a blanket guarantee for every activity. Check the manufacturer’s usage guidance and have seals inspected by a qualified professional. The sample specifications in this boutique are illustrative.",
      ],
    ],
  },
  faq: {
    title: "At your service.",
    sections: [
      [
        "How do I place an order?",
        "Choose your watch, add it to the bag, then sign in and enter an Indian delivery address. Cash on delivery is available. Online payment via Razorpay appears only when the owner has configured Razorpay keys.",
      ],
      [
        "How can I track an order?",
        "Open your account to view orders and their current processing status. Status updates are managed by the store administrator; courier tracking is not connected.",
      ],
      [
        "What does demo mode mean?",
        "Demo mode stores sample products, wishlists, and orders in this browser. It makes no payment and creates no real purchase. You can preview customer and administrator accounts without credentials. Use sample details only.",
      ],
      [
        "Can I change my password?",
        "A self-service password reset email flow is not included. The owner can reset the administrator password with the documented local command. Customer password recovery requires an email-provider integration before commercial launch.",
      ],
    ],
  },
  privacy: {
    title: "Privacy & terms",
    sections: [
      [
        "About this project",
        "AUREL is a fictional sample storefront. Images are AI-generated original product concepts. This page is a starter policy and must be replaced with business-specific, reviewed terms before accepting real customers.",
      ],
      [
        "What is stored",
        "In live mode, the app stores account details, hashed passwords, delivery information, order records, wishlist entries, newsletter opt-ins and administrator audit events. Sessions use an HttpOnly cookie. Card and UPI details are handled by Razorpay and are never collected by this application.",
      ],
      [
        "Browser storage",
        "The shopping bag and guest wishlist are stored locally. Demo data stays in this browser; clearing or resetting the demo removes it. Demo mode is a showcase, not an authentication or payment system.",
      ],
      [
        "Requests and retention",
        "The business owner is responsible for publishing a valid privacy contact, retention schedule, deletion process, refund terms and applicable rights. Newsletter opt-ins are stored, but this project sends no marketing emails.",
      ],
    ],
  },
};
export function Help() {
  const { topic } = useParams();
  const h = helpContent[topic];
  if (!h)
    return (
      <Empty
        title="Let’s find the right page."
        description="Visit the collection or your account to continue."
      />
    );
  return (
    <article className="prose">
      <p className="eyebrow">THE AUREL CONCIERGE</p>
      <h1>{h.title}</h1>
      {h.sections.map(([t, p]) => (
        <section key={t}>
          <h2>{t}</h2>
          <p>{p}</p>
        </section>
      ))}
      <Link className="text-link" to="/account">
        Visit your account
        <ArrowRight size={17} />
      </Link>
    </article>
  );
}
