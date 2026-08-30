# 904 Meal Prepz

Premium, mobile-first single-page storefront for a Jacksonville meal-prep business.

## Run & Operate

- `pnpm --filter @workspace/904-meal-prepz run dev` — run the storefront preview
- `pnpm --filter @workspace/904-meal-prepz run build` — build the Vercel-ready static output
- `pnpm --filter @workspace/904-meal-prepz run typecheck` — typecheck the storefront
- `pnpm --filter @workspace/api-server run dev` — run the shared API server when needed
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- The storefront needs no environment variables, database, or API server.

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/904-meal-prepz/src/App.tsx` — route boundary between the public site and protected admin workspace
- `artifacts/904-meal-prepz/src/PublicSite.tsx` — multi-page storefront, quantity builder, weekly summary, six-step order flow, SEO metadata, and portable order submission
- `artifacts/904-meal-prepz/src/AdminApp.tsx` — owner-only operations workspace with seeded development preview
- `artifacts/904-meal-prepz/src/data/adminDemo.ts` — clearly labeled dashboard preview records and analytics
- `artifacts/904-meal-prepz/src/data/weeklyMenu.ts` — editable weekly menu, deadline, pickup windows, and delivery zones
- `artifacts/904-meal-prepz/public/images/meals/` — local meal photography
- `artifacts/904-meal-prepz/public/images/brand/` — local editorial/brand photography
- `artifacts/904-meal-prepz/public/videos/` — local browser-ready kitchen and meal footage
- `artifacts/904-meal-prepz/README.md` — local run, Vercel handoff, admin setup, content editing, and payment integration notes
- `artifacts/api-server/src/routes/admin.ts` — token-protected admin routes and public order persistence boundary
- `lib/db/src/schema/mealPrep.ts` — PostgreSQL-compatible menu, meal, customer, order, fulfillment, payment, and admin tables

## Architecture decisions

- Portable weekly preorder frontend with React state and `localStorage` selection persistence for the no-backend demo; when `VITE_API_BASE_URL` is configured, order creation moves to the server boundary.
- Menu content is local TypeScript data so the first handoff does not depend on a product API.
- Checkout presents Square / Apple Pay as the preferred method but carries Cash App, Venmo, Zelle, and other manual methods through the same normalized order record. Orders start payment-pending until Square confirms success or an owner uses the protected Mark paid action for a manual transfer.
- Admin preview data is never presented as production data. Protected API routes require `ADMIN_API_TOKEN`; database access is configured with `DATABASE_URL`.
- All used photography is committed under `public/` and referenced with portable root-relative paths.

## Product

Visitors can move through dedicated `/`, `/menu`, `/order`, `/how-it-works`, `/about`, `/gallery`, and `/contact` pages with consistent navigation, supplied-logo branding, local Jacksonville storytelling, weekly menu browsing, quantity controls, and a six-step preorder flow. Owners can open `/admin` for protected, URL-backed dashboard, orders, prep, meal library, weekly menu, customers, analytics, payments, and settings destinations using one shared order ledger.

## User preferences

- Keep this site portable from Replit to GitHub/Vercel and avoid platform-specific runtime features.

## Gotchas

- The artifact workflow supplies preview routing automatically; do not add a second storefront workflow.
- Replace demo contact values and placeholder testimonials before a client launch.
- Supplied portrait footage is already converted and stored in `public/videos`; replace those files later if higher-resolution originals are provided.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
