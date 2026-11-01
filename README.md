# Premium Watch Shop

A complete React storefront and Express store API, with a deliberately warm luxury design, original watch imagery, a customer account area, and a protected admin dashboard. Prepared for local development on Windows and deployment to one Vercel project.

## Start locally — Windows, macOS or Linux

Install **Node.js 24 LTS**. Extract the ZIP, then open a terminal in `aurel-watch-shop` (the directory containing `package.json`).

```bash
npm ci
npm run setup
npm run dev
```

Open **http://localhost:5173**. The API runs at **http://localhost:3001/api/health**. Data is stored in MongoDB through `MONGODB_URI` in `.env`; the default `mongodb://127.0.0.1:27017/aurel` uses a locally installed MongoDB service, and collections plus the sample catalog are created on first start. `npm run setup` preserves an existing `.env` and generates a unique local administrator password when creating a new one.

On Windows you can instead double-click **start-windows.bat**. Leave the terminal open while using the app.

**Admin:** open `/account`, sign in with `admin@aurel.local` and the `ADMIN_PASSWORD` stored in your local `.env`, then open `/admin`. There is no shared default password. A customer can register from the same account page using a password of at least 12 characters.

## Choose the mode you need

| Mode                      | What works                                                                                        | Configuration                                                                        |
| ------------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Local full stack          | Real local accounts, orders, stock, admin, wishlist                                               | Default `npm run dev`; needs MongoDB on `MONGODB_URI`                                |
| Vercel demo               | All storefront screens, sample customer/admin roles, sample orders and editing in browser storage | No environment variables required; no database needed                                |
| Vercel full stack         | Same React UI + Express API in one deployment, persistent MongoDB                                 | Set `MONGODB_URI`, `APP_URL`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `VITE_APP_MODE=live`    |
| Frontend-only development | Browser-only sample interactions                                                                  | Set `VITE_APP_MODE=demo`, run `npm run dev:frontend`                                 |

`VITE_APP_MODE=auto` is the default. An explicit demo response from an unconfigured Vercel backend, or a missing frontend-only API, opens the clearly labelled demo. A configured backend failure is shown as an error; a live session is never silently converted into a fake order. `live` requires a working database-backed API. Changing a `VITE_` variable on Vercel requires a rebuild.

## What is included

- Responsive ivory, forest-green and brass storefront; five bundled original images, with no external image CDN dependency.
- Collection search, category/stock/price filters, sorting, product pages, image zoom and specifications.
- Persistent bag, guest saved watches, account-synced wishlist and a validated Indian address checkout.
- Welcome code **AUREL10**: 10% discount capped at ₹5,000. Shipping is ₹299 below ₹10,000 after discount, otherwise complimentary. All catalog prices include tax.
- Cash-on-delivery orders, printable order receipts, order history and status progression.
- Optional Razorpay online payment (cards, UPI, net banking, wallets) with server-side signature and amount verification plus signed webhooks.
- Customer registration/login/logout, scrypt password hashing, opaque server-side sessions, HttpOnly/SameSite cookies, same-origin mutation checks and database-backed authentication throttling.
- Admin product creation/editing/archiving, inventory management, order progression, dashboard totals, CSV export and audit events.
- MongoDB with Mongoose for all persistence; `npm run db:migrate` imports a legacy SQLite file once; Docker configuration included.
- Automated backend tests, Vercel API route checks and detailed deployment documentation.

## Vercel: fastest demo deployment

1. Push the **contents of `aurel-watch-shop`** to a Git repository. Do not commit `.env`, `data`, `node_modules` or `dist`.
2. Import the repository in Vercel. Select the folder containing this `package.json` as **Root Directory**.
3. Use **Vite**, Node.js **24.x**, install command **`npm ci`**, build command **`npm run build`**, output **`dist`**.
4. Deploy. With no `MONGODB_URI`, the showroom works in demo mode. The customer and admin preview buttons are on `/account`.

The included `vercel.json` routes `/api/*` to the API function and all frontend deep links to the SPA. Both frontend and API are in the same repository/deployment. You do not deploy `server` as a separate Vercel project.

For persistent hosted accounts/orders, follow **[docs/VERCEL.md](docs/VERCEL.md)**. Vercel functions need a network-reachable MongoDB such as MongoDB Atlas; a local database is never used for Vercel persistence.

## Useful commands

```bash
npm test                  # isolated MongoDB tests; starts its own temporary mongod
npm run build             # production frontend
npm start                 # API + built frontend at http://localhost:3001
npm run db:seed           # create collections, indexes and the sample catalog; existing records are preserved
npm run db:migrate        # one-off import of a legacy SQLite file (default ./data/aurel.sqlite) into MongoDB
npm run admin:create      # create/reset the configured admin and revoke prior sessions
npm run orders:reconcile  # settle awaiting-payment Razorpay orders from the provider
```

`npm run dev` refreshes React changes automatically. Restart it after backend changes, or use `npm run dev:server` with `npm run dev:frontend` in separate terminals for backend watch mode. `npm run preview` serves only the built frontend; use `npm start` to test the full built application.

## Project layout

```text
api/index.js          Vercel function and nested-route normalization
server/app.js         Express endpoints, validation, permissions and webhook
server/db.js          Mongoose connection, seeding and row mapping
server/models.js      Collection schemas and indexes
server/orders.js      Atomic stock reservation, idempotent orders, payment settlement
server/security.js    Passwords, sessions, rate limiting
shared/catalog.js     Initial catalog, currency formatting and price rules
src/                  React screens, demo adapter, application state and CSS
public/images/        Original generated watch images
scripts/              Local setup, dev launcher, database/admin/payment utilities
tests/                Isolated order, auth, API and Vercel-entrypoint tests
docs/                 Deployment, API, architecture and verification notes
```

## Customize it

Use Admin → Products for catalog changes. Four sample watches are supplied; add more from the admin page. Use one of the bundled image paths, add a new image to `public/images`, or enter an HTTPS image URL. A file-upload/object-storage service is not included.

Change initial catalog data in `shared/catalog.js` **before first initialization**. Existing database products are deliberately never overwritten by seeding. Edit them in Admin once the database exists. Brand copy and articles live in `src/Storefront.jsx`; colors, spacing and responsive layouts are in `src/styles.css`.

## Scope and operational notes

This is a working commerce starter with a fictional catalog, not a configured trading business. Cash-on-delivery checkout works end to end in local/full-stack mode. Razorpay requires your own activated account, API keys and webhook; no real payment was captured during development.

Email delivery/password-recovery emails, courier integration, refunds/returns automation, customer self-service cancellation, product uploads, multi-currency, GST invoice generation and a search engine SSR layer are not included. Receipts are order summaries, not statutory tax invoices. Newsletter opt-ins are stored; no marketing email is sent. The starter policy pages explicitly identify the sample terms.

Before using real customers, replace the fictional product specifications and policies with your verified catalog/business details, configure payment/fulfilment services, and set up database backups. See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for implementation and failure-recovery details, and [docs/VERIFICATION.md](docs/VERIFICATION.md) for exactly what was tested.
