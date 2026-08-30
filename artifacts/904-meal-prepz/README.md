# 904 Meal Prepz

Presentation-first single-page weekly preorder storefront for a Jacksonville meal-prep business. The app is intentionally frontend-only: the weekly menu, selections, deadline, fulfillment flow, and Square checkout handoff demo run in React state with selections persisted in `localStorage`.

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

## Deploy to Vercel

Import this directory as a Vercel project. Vercel detects Vite automatically:

- Build command: `pnpm run build` (or `npm run build`)
- Output directory: `dist/public`
- Install command: `pnpm install` (or `npm install`)

No server, database, Replit runtime, or environment variables are required for the current demo. `vite.config.ts` has portable defaults for local/Vercel builds; the Replit preview may override the port automatically.

## Editing content

- The complete weekly menu lives in `src/data/weeklyMenu.ts`. Replace the `meals` array, `orderDeadline`, `pickupWindows`, and `deliveryZones` there for each new week.
- Each meal is rendered dynamically from structured fields including `mealNumber`, `premium`, price, macros, and local image path.
- Contact details are intentionally editable demo values in `src/App.tsx` (`hello@904mealprepz.com` and `(904) 555-0184`).
- Meal photography is in `public/images/meals`.
- Brand/editorial media is in `public/images/brand`.
- Supplied portrait footage is stored as browser-friendly MP4 files in `public/videos`. `public/videos/README.md` documents the files and replacement path.
- The favicon is `public/favicon.svg`.

## Ordering / future payments

The customer flow is a five-step weekly preorder:

1. Build your week with quantity controls beside each meal.
2. Choose a pickup window or configurable delivery zone.
3. Enter customer information and optional notes.
4. Review meals, quantities, premium charges, delivery, and final total.
5. Reach the clearly labeled Square hosted checkout handoff.

The current demo does not submit an order or accept payment. Replace the final Square handoff with a server-created hosted checkout session when launching. Keep secret keys server-side and validate fulfillment zones, cutoff times, inventory, taxes, and delivery fees on the server.