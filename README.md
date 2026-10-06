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

Buyers pay by **bank transfer** into a one-time account number generated per order (Pandascrow virtual account). **The browser never talks to Pandascrow**; the backend creates the account, receives the signed webhook, and marks the order paid. Funds sit in the platform wallet until the buyer confirms receipt, then the backend pays the vendor's bank account. Refunds go to a bank account the buyer provides. Korapay and crypto are not used for food orders. See [docs/BACKEND-GAP-ANALYSIS.md](docs/BACKEND-GAP-ANALYSIS.md) for the current backend status and go-live checklist, and [docs/BACKEND-CHANGES.md](docs/BACKEND-CHANGES.md) for the original contract.

Feature flags: `VITE_FIAT_ENABLED`, `VITE_CRYPTO_ENABLED` (`off` hides all wallet UI; keep it off for DezenFoods).

## Tests

```bash
npm run test:run        # unit + component tests
npm run test:e2e:full   # real backend (harness) + the app's actual API layer; needs the backend checkout, see src/__tests__/e2e/README.md
```

## Layout

- `src/pages` Cart, PaymentCallback, VendorApply, VendorDashboard, VendorStore, Admin, plus the original marketplace pages
- `src/store/api` RTK Query APIs (`paymentsApi`, `vendorsApi`, `adminApi`, `ordersApi`, …) and `slices/cartSlice.ts`
- `src/utils/food.ts`, `src/utils/categories.ts` food metadata
- `docs/` audits, SEO notes, backend changes
