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

- `artifacts/904-meal-prepz/src/App.tsx` — page sections, quantity builder, weekly summary, and five-step order flow
- `artifacts/904-meal-prepz/src/data/weeklyMenu.ts` — editable weekly menu, deadline, pickup windows, and delivery zones
- `artifacts/904-meal-prepz/public/images/meals/` — local meal photography
- `artifacts/904-meal-prepz/public/images/brand/` — local editorial/brand photography
- `artifacts/904-meal-prepz/public/videos/` — local browser-ready kitchen and meal footage
- `artifacts/904-meal-prepz/README.md` — local run, Vercel handoff, content editing, and payment integration notes

## Architecture decisions

- Frontend-only weekly preorder demo with React state and `localStorage` selection persistence for easy GitHub/Vercel transfer.
- Menu content is local TypeScript data so the first handoff does not depend on a product API.
- Checkout is explicitly demo-only; future payment providers should be connected server-side.
- All used photography is committed under `public/` and referenced with portable root-relative paths.

## Product

Visitors can browse the weekly menu grouped by category, choose meal quantities, see meal and premium subtotals update live, select pickup or delivery, enter customer details, review the order, and reach a clearly labeled Square hosted-checkout handoff. The page also includes local brand storytelling, an editorial meal gallery, demo social proof, contact links, and responsive navigation.

## User preferences

- Keep this site portable from Replit to GitHub/Vercel and avoid platform-specific runtime features.

## Gotchas

- The artifact workflow supplies preview routing automatically; do not add a second storefront workflow.
- Replace demo contact values and placeholder testimonials before a client launch.
- Supplied portrait footage is already converted and stored in `public/videos`; replace those files later if higher-resolution originals are provided.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
