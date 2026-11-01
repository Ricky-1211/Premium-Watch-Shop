export const products = [
  {
    id: "verde-automatic",
    name: "Verde Automatic",
    collection: "Automatic",
    price: 2490000,
    stock: 18,
    image: "/images/verde.png",
    color: "Forest green",
    strap: "Stainless steel",
    movement: "Automatic",
    size: "40 mm",
    water: "100 m",
    reserve: "40 hours",
    badge: "SIGNATURE",
    description:
      "A study in quiet confidence. An emerald sunburst dial meets a beautifully brushed steel bracelet — a considered companion for the everyday.",
    featured: true,
  },
  {
    id: "oro-classic",
    name: "Oro Classic",
    collection: "Dress",
    price: 1890000,
    stock: 24,
    image: "/images/oro.png",
    color: "Champagne",
    strap: "Brown leather",
    movement: "Quartz",
    size: "38 mm",
    water: "30 m",
    reserve: "Battery powered",
    badge: "THE ESSENTIAL",
    description:
      "Warm champagne tones, a slender gold-tone case and supple leather. A beautifully restrained timepiece that makes every occasion feel a little more special.",
    featured: true,
  },
  {
    id: "noir-chronograph",
    name: "Noir Chronograph",
    collection: "Chronograph",
    price: 3290000,
    stock: 12,
    image: "/images/noir.png",
    color: "Obsidian",
    strap: "Black rubber",
    movement: "Quartz chronograph",
    size: "42 mm",
    water: "100 m",
    reserve: "Battery powered",
    badge: "NEW ARRIVAL",
    description:
      "Precision with presence. An obsidian dial, contrasting subdials and a comfortable rubber strap bring sporting character to an everyday silhouette.",
    featured: true,
  },
  {
    id: "bleu-diver",
    name: "Bleu Diver",
    collection: "Dive",
    price: 2890000,
    stock: 16,
    image: "/images/bleu.png",
    color: "Midnight blue",
    strap: "Stainless steel",
    movement: "Automatic",
    size: "41 mm",
    water: "200 m",
    reserve: "40 hours",
    badge: "EXPLORER SERIES",
    description:
      "Made for a different pace. Deep blue tones and a distinctive timing bezel pair with luminous markers in a purposeful steel silhouette.",
    featured: true,
  },
];
export const collections = [
  "All watches",
  "Automatic",
  "Dress",
  "Chronograph",
  "Dive",
];
export const money = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value / 100);
export function totals(items, coupon = "") {
  const subtotal = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );
  const discount =
    coupon.toUpperCase() === "AUREL10"
      ? Math.min(Math.round(subtotal * 0.1), 500000)
      : 0;
  const shipping = subtotal && subtotal - discount < 1000000 ? 29900 : 0;
  return {
    subtotal,
    discount,
    shipping,
    total: subtotal - discount + shipping,
  };
}
