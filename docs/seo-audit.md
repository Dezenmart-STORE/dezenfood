# Dezenmart (lean) — SEO Audit

**Scope:** Frontend SEO for marketing/traffic. **Date:** 2026-07-06.
**Builds on:** the existing `docs/SEO-IMPLEMENTATION.md` (verified against code, not re-litigated).
**Goal of this doc:** settle the one architectural decision that gates the rest —
**how the app renders for crawlers and social scrapers** — with evidence.

## Verdict in one line

The on-page SEO groundwork is genuinely good (centralised config, per-page meta,
JSON-LD, sitemaps, a strong `robots.txt`). But it's a **client-rendered SPA**, so
**social/link-preview scrapers see none of it** — which directly caps the marketing
and referral traffic you care about. Fix rendering for bots; everything else is polish.

---



## What's already solid (verified in code)

- **Centralised config** — `src/utils/seo/seoConfig.ts` (site, titles, OG, Twitter, Organization schema). Consistent canonical domain `https://dezenmart.com`.
- **Static homepage** `<head>` — `index.html` has description, keywords, robots directives, OG + Twitter cards with a 1200×630 image, `WebSite` + `Organization` JSON-LD (incl. a `SearchAction`), and a canonical. A scraper hitting `/` gets a correct preview.
- **Per-page meta hook** — `useSEO` (`src/hooks/useSEO.ts`) sets title/description/OG/Twitter/canonical/JSON-LD, used on Home, Product, SingleProduct, Community, ReferralLanding.
- **Sitemaps** — `sitemap.xml`, `sitemap-categories.xml`, and a **dynamically generated** `sitemap-products.xml` (`scripts/generate-product-sitemap.ts` fetches live products from the API).
- **robots.txt** — allows public routes, disallows `/account`, `/orders`, `/auth`, `/chat`, etc.; references the sitemap.

---



## Findings


| ID     | Sev | Effort | Finding                                                                                                                                                                                                                                                                                                                                                                                                        | Evidence                                                                                      |
| ------ | --- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| SEO-01 | 🔴  | L      | **Client-side rendering — meta/OG invisible to social scrapers.** `useSEO` writes tags to `document.head` *after* JS runs. Googlebot renders JS (so text ranking mostly survives), but **WhatsApp, X, Facebook, iMessage, Slack, LinkedIn do not execute JS** — every shared product/category link falls back to the generic homepage `index.html` preview. This is the direct cap on referral/social traffic. | pure SPA (no prerender/SSG/SSR in `package.json`/`vite.config.ts`); `useSEO.ts` DOM injection |
| SEO-02 | 🔴  | S      | **Sitemap is never regenerated on deploy.** Netlify runs `npm run build` (`netlify.toml`), but sitemap generation lives in `build:production`/`deploy:prod`. So `sitemap-products.xml` is only as fresh as the last *manual* run — new products aren't discoverable, delisted ones 404.                                                                                                                        | `netlify.toml` command vs `package.json:10,23`                                                |
| SEO-03 | 🟠  | S      | **Search Console / Bing not verified** — verification codes are still placeholders (`"your-google-verification-code"`). No index-coverage or query data until fixed.                                                                                                                                                                                                                                           | `seoConfig.ts` verification block; `index.html` verification meta commented out               |
| SEO-04 | 🟠  | S      | **Canonical/OG domain vs deploy host.** Everything canonicalises to `dezenmart.com`, but the app also lives at `dezenmart.netlify.app`. If the custom domain isn't the enforced primary (with `netlify.app` 301→ custom, or noindexed), that's duplicate content and split ranking signals.                                                                                                                    | `index.html` canonical/og:url; deploy host                                                    |
| SEO-05 | 🟡  | M      | **No per-product OG image/title for bots.** Even where `useSEO` sets a product image, scrapers can't see it (SEO-01). Product shares won't show the product — the single highest-leverage marketing asset. Resolved by the SEO-01 fix.                                                                                                                                                                         | consequence of SEO-01                                                                         |
| SEO-06 | 🟡  | M      | **Core Web Vitals risk hurts ranking.** ~2 MB `vendor-self` chunk + heavy web3 JS → poor mobile LCP/INP, which is a ranking factor. Tracked under PERF in the main audit.                                                                                                                                                                                                                                      | bundle report (PERF-01)                                                                       |
| SEO-07 | ⚪   | S      | Locale is `en_US`; for a Nigeria-first marketplace `en_NG` is more accurate. No `hreflang` needed while single-locale.                                                                                                                                                                                                                                                                                         | `seoConfig.ts` openGraph.locale                                                               |
| SEO-08 | ⚪   | S      | Confirm every product page emits `Product` JSON-LD with `offers` (price, `priceCurrency`, `availability`) and `BreadcrumbList` — required for rich results. (Documented in `SEO-IMPLEMENTATION.md`; verify it renders with real data.)                                                                                                                                                                         | `useSEO` structuredData usage                                                                 |


---



## The decision: prerender vs SSR

You asked to decide after this audit. Recommendation: **neither a pure static prerender nor a
full Next.js SSR rewrite — do targeted hybrid rendering.**

**Why not full SSR (Next.js):** the app is deeply client-only (wagmi, WalletConnect, MetaMask/
thirdweb SDKs, Mento/Uniswap). Server-rendering all of that is a large, risky rewrite of routing
and data-fetching for little SEO gain over the cheaper option below.

**Why not pure build-time prerender alone:** product/category pages are dynamic and numerous;
snapshotting them at build time goes stale and bloats builds.

**Recommended — "dynamic rendering for bots" + static prerender for marketing:**

1. **Netlify Edge Function** that detects crawler/scraper user-agents on `/product/:id` and
  `/product/category/:name`, fetches the product/category from the API, and returns a tiny HTML
   document with the correct `<title>`, OG/Twitter tags, and `Product`/`BreadcrumbList` JSON-LD.
   Humans still get the SPA untouched. This fixes share previews **and** gives crawlers real HTML,
   with no change to the React app.
2. **Build-time prerender** the small set of static/marketing routes (`/`, `/community`,
  `/referral`, category landing) via a Vite prerender plugin, so even non-JS bots get full HTML there.
3. Wire **SEO-02** (sitemap on every deploy) and **SEO-03** (Search Console) alongside.

This gets ~90% of the SEO/marketing benefit at a fraction of the SSR cost and risk. Revisit full
SSR only if organic search becomes a primary growth channel later.

---



## Suggested order

1. **SEO-02** (build command → regenerate sitemap on deploy) — one-line, immediate.
2. **SEO-03 / SEO-04** (verify Search Console; enforce primary domain + redirect) — config.
3. **SEO-01/05** (dynamic rendering for bots) — the traffic unlock; build the Edge Function.
4. **SEO-06** (CWV) via the PERF workstream.
5. **SEO-07/08** polish + rich-results validation.

Items 1–2 I can implement now (frontend/config). Item 3 is the main build — I'll spec and
implement the Edge Function against the product/category API once you greenlight the approach.