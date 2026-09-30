# DezenFoods (frontend)

The food vertical of the DezenMart ecosystem: a React + Vite + TypeScript app adapted from the DezenMart marketplace. It shares the DezenMart backend and Google sign-in, and adds food categories, vendor onboarding, a cart, an order lifecycle (paid → preparing → on the way → delivered) and fiat payments through the backend.

## Run

```bash
npm ci
cp .env.example .env      # set VITE_API_URL and VITE_WALLETCONNECT_PROJECT_ID at minimum
npm run dev
npm run test:run
npm run build
```

## Rebranding without touching components

- Name, tagline, description, URLs, support email, socials: `src/config/brand.defaults.json` or `VITE_BRAND_*` / `VITE_SITE_URL` env vars. Used by the app (`src/config/brand.ts`), `index.html` (via `__BRAND_*__` tokens filled by `vite.config.ts`), the PWA manifest and the sitemap/robots script.
- Colours: `--brand` / `--brand-hover` in `src/index.css` (Tailwind `bg-brand`, `text-brand`). Keep `brand.defaults.json` `primary` in sync.
- Categories: `src/config/categories.json` (one entry per segment; the app, vendor form and sitemap all read it).
- Logos: replace `public/images/logo.svg`, `logo-full.png` (1200×630 share image), `logo.png`, and `public/icons/icon.svg`, then `npm run generate-icons`. The files currently in the repo are the DezenMart mark tinted orange as a placeholder.

## Payments

The buyer chooses the rail at checkout: card/bank (Korapay), escrow (Pandascrow), or crypto wallet. **The browser never talks to Korapay or Pandascrow**; the backend creates the payment, verifies it and receives webhooks. An order becomes paid only when the backend says so. See [docs/BACKEND-CHANGES.md](docs/BACKEND-CHANGES.md) for the full contract and the backend work list.

Feature flags: `VITE_FIAT_ENABLED`, `VITE_CRYPTO_ENABLED` (`off` hides all wallet UI).

## Layout

- `src/pages` Cart, PaymentCallback, VendorApply, VendorDashboard, VendorStore, Admin, plus the original marketplace pages
- `src/store/api` RTK Query APIs (`paymentsApi`, `vendorsApi`, `adminApi`, `ordersApi`, …) and `slices/cartSlice.ts`
- `src/utils/food.ts`, `src/utils/categories.ts` food metadata
- `docs/` audits, SEO notes, backend changes
