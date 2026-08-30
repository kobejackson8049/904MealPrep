# 904 Meal Prepz

Multi-page weekly preorder storefront plus an owner operations workspace for a Jacksonville meal-prep business. The public menu remains portable and demo-friendly, while the admin and order API provide a production boundary for PostgreSQL-compatible persistence.

## Run locally

```bash
pnpm install
pnpm run dev
```

Build and preview the production bundle:

```bash
pnpm run build
pnpm run serve
```

## Deploy the public storefront to Vercel

Import this directory as a Vercel project. Vercel detects Vite automatically:

- Build command: `pnpm run build` (or `npm run build`)
- Output directory: `dist/public`
- Install command: `pnpm install` (or `npm install`)

The public demo can run without a server or database. `vite.config.ts` has portable defaults for local/Vercel builds; the Replit preview may override the port automatically. `vercel.json` rewrites page deep links back to the Vite entry point so routes such as `/menu` and `/order` survive a refresh. For a production order handoff, set `VITE_API_BASE_URL` to the HTTPS URL of the API server. If it is absent, checkout intentionally stays in the no-payment demo mode.

## Public routes

- `/` — home overview with the active-week preview, deadline, process, story, and reviews
- `/menu` — full published weekly menu grouped for browsing
- `/order` — quantity-first weekly preorder and six-step checkout
- `/how-it-works` — the weekly ordering, prep, pickup, and delivery rhythm
- `/about` — the Jacksonville story, mission, and food philosophy
- `/gallery` — editorial meal photography and kitchen video
- `/contact` — FAQ, cutoff guidance, and functional phone/email/social links

## Owner operations workspace

Open `/admin` to reach the separate owner-facing workspace. In development, the seeded preview is available so the dashboard can be reviewed without customer data or credentials. Production access is closed until the API is configured with an admin token. After preview access, the sidebar uses dedicated URL destinations for dashboard, orders, kitchen prep, meals, weekly menu, customers, analytics, payments, and settings.

The workspace includes:

- weekly KPI overview, cutoff indicator, recent orders, payment and fulfillment mix
- order search, detail view, status changes, payment methods, pending balances, and manual Mark paid confirmation
- kitchen prep quantities with meal/customer drill-down, print output, and CSV export
- customer profiles, lifetime spend, repeat-order signals, and fulfillment history
- editable weekly meal availability, pricing/macros fields, and sold-out states
- historical revenue/order charts, popular meals, low performers, and retention signals
- pickup and delivery worklists with delivery zones and fee visibility

## Portable API and database setup

The shared API lives in `artifacts/api-server`; the shared PostgreSQL-compatible schema lives in `lib/db/src/schema/mealPrep.ts`. It uses Drizzle and reads `DATABASE_URL` from the environment, so it can point at Replit PostgreSQL, Neon, Railway, Supabase, or another PostgreSQL-compatible provider without changing application code.

Required production environment:

- `DATABASE_URL` — PostgreSQL connection string for the API/schema package
- `ADMIN_API_TOKEN` — secret token required by all `/api/admin/*` routes; send it as `Authorization: Bearer ...` or `x-admin-token`
- `VITE_API_BASE_URL` — public HTTPS API base URL used by the storefront order handoff
- `PAYMENT_CASH_APP_INSTRUCTIONS`, `PAYMENT_VENMO_INSTRUCTIONS`, `PAYMENT_ZELLE_INSTRUCTIONS`, `PAYMENT_OTHER_INSTRUCTIONS` — server-side instructions returned with manual payment orders
- `VITE_PAYMENT_CASH_APP_INSTRUCTIONS`, `VITE_PAYMENT_VENMO_INSTRUCTIONS`, `VITE_PAYMENT_ZELLE_INSTRUCTIONS`, `VITE_PAYMENT_OTHER_INSTRUCTIONS` — public checkout copy for the same configured manual payment instructions

Development schema setup:

```bash
pnpm --filter @workspace/db run push
pnpm --filter @workspace/api-server run dev
```

The API exposes protected overview, orders, order status, payment confirmation, customers, current menu, meal updates, prep, and CSV export routes. `POST /api/orders` validates the cutoff, menu membership, availability, customer fields, delivery zone, and payment method server-side before creating one normalized customer/order/order-item set. Every order stores its payment method and starts `pending`; Square/Apple Pay remains the preferred checkout boundary, while Cash App, Venmo, Zelle, and other manual methods return the exact amount due and configured instructions. `PATCH /api/admin/orders/:id/payment` marks the same order paid without changing its payment method. Revenue, paid/unpaid counts, customer lifetime spend, and active kitchen prep totals are derived from that shared order ledger.

The database schema is intentionally environment-based rather than tied to browser storage or Replit-only runtime state. A production deployment should add the client’s identity provider in front of the admin token boundary and keep customer data server-side.

## Editing content

- The complete weekly menu lives in `src/data/weeklyMenu.ts`. Replace the `meals` array, `orderDeadline`, `pickupWindows`, and `deliveryZones` there for each new week.
- Each meal is rendered dynamically from structured fields including `mealNumber`, `premium`, price, macros, and local image path.
- Contact details are intentionally editable demo values in `src/PublicSite.tsx` (`hello@904mealprepz.com` and `(904) 555-0184`).
- Meal photography is in `public/images/meals`.
- Brand/editorial media is in `public/images/brand`, including `public/images/brand/904-meal-prepz-logo.jpeg`, the supplied 904 Meal Prepz logo used in public and admin navigation.
- Supplied portrait footage is stored as browser-friendly MP4 files in `public/videos`. `public/videos/README.md` documents the files and replacement path.
- The favicon is `public/favicon.svg`.

## Ordering / payments

The customer flow is a six-step weekly preorder:

1. Build your week with quantity controls beside each meal.
2. Choose a pickup window or configurable delivery zone.
3. Enter customer information and optional notes.
4. Choose Square / Apple Pay (preferred) or a supported manual method.
5. Review meals, quantities, premium charges, delivery, and final total.
6. Submit one normalized order and receive an order confirmation.

Square / Apple Pay orders remain pending until a successful provider callback marks them paid; failed or incomplete payments remain pending. Manual payment orders are created normally with an exact amount due and remain pending until an owner confirms the transfer with Mark paid. Keep provider secrets server-side and validate fulfillment zones, cutoff times, inventory, taxes, and delivery fees on the server.