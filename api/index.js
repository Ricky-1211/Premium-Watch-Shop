import { createApp } from "../server/app.js";
const app = createApp();
// The explicit route parameter makes nested API routes reliable after a Vercel rewrite.
export default function handler(req, res) {
  const url = new URL(req.url, "http://localhost");
  const route = url.searchParams.get("route");
  if (route !== null) {
    url.searchParams.delete("route");
    req.url =
      "/api/" + route + (url.search ? "?" + url.searchParams.toString() : "");
  }
  return app(req, res);
}
