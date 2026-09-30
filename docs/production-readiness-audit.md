# Dezenmart (lean) — Production Readiness Audit

**Scope:** Frontend repo only (`dezen/dezen_main/lean`). Backend and smart contracts are
separate systems; items that require their involvement are marked **[coordinate: backend]**
or **[coordinate: contract]**. **Date:** 2026-07-06.

**Method:** Static review of source, config, and build. On-chain behaviour and backend responses
were not executed (no prod access from the review environment); items needing runtime
confirmation are marked **(verify)**.

## Severity & effort

- **Severity:** 🔴 Critical · 🟠 High · 🟡 Medium · ⚪ Low/Info
- **Effort:** S (<½ day) · M (½–2 days) · L (>2 days / cross-team)

---

## 1. Security — Frontend

| ID | Sev | Effort | Finding | Evidence |
|----|-----|--------|---------|----------|
| SEC-01 | 🔴 | M | **Auth JWT and user object stored in `localStorage`** — readable by any injected/3rd-party script (XSS ⇒ full account takeover). Also duplicated across 4 files, so no single source of truth. | `context/AuthContext.tsx:37-39,247`, `pages/AuthCallback.tsx:30`, `services/apiService.ts:14`, `store/api/baseApi.ts:16` |
| SEC-02 | 🟠 | M | **No security headers on the host.** `netlify.toml` only has the SPA redirect — no CSP, HSTS, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, frame-ancestors. | `netlify.toml` (no `_headers` file) |
| SEC-03 | 🟠 | S | **Production source maps are public** (`sourcemap: true`) — ships readable source to anyone. Should be `hidden` and uploaded to the error monitor only. | `vite.config.ts:137` |
| SEC-04 | 🟡 | S | **`target="_blank"` without `rel="noopener noreferrer"`** (11 occurrences) — reverse-tabnabbing. (verify: rel may be on a separate line for some.) | `grep target="_blank"` → 11, none with noopener on-line |
| SEC-05 | 🟡 | S | **`.gitignore` only ignores `settings.json`** — `.env`, `node_modules`, `dist` are not ignored. Risk of committing `.env` / bloating history. Audit git history for a leaked `.env`. | `.gitignore` |
| SEC-06 | ⚪ | S | 203 `console.*` calls. **Mitigated** by `drop_console: true` in prod, but that also drops `console.error` (lose monitoring breadcrumbs). Route logging through a small logger gated by env. | `vite.config.ts:241`; `grep console.*` → 203 |
| SEC-07 | ⚪ | S | Two parallel HTTP layers (`services/apiService.ts` + RTK Query `baseApi`) each re-implement token/auth handling → drift risk. Consolidate on RTK Query. | `services/apiService.ts`, `store/api/baseApi.ts` |

**Recommendation (SEC-01):** Move to **httpOnly, Secure, SameSite=strict/lax cookies** issued by the
backend; frontend sends `credentials: 'include'` and stops touching the token. **[coordinate: backend]** —
spec required (login sets cookie, `/logout` clears it, CSRF strategy for cookie auth).

---

## 2. Security — Web3 / Blockchain

| ID | Sev | Effort | Finding | Evidence |
|----|-----|--------|---------|----------|
| W3-01 | 🟠 | S–M | **Approval amount must be exact, not infinite.** Confirm `useApproval` approves the precise order amount, not `MaxUint256`. Infinite approvals are a standing drain risk if the escrow is ever compromised. (verify) | `hooks/useApproval.ts:36-111` |
| W3-02 | 🟠 | M | **Client-computed totals feed the payment.** Item price + the logistics cost we compute client-side determine the escrow amount. These must be re-validated server/contract-side before funds release — never trust the client total. | `components/product/singleProduct/PurchaseSection.tsx` (computedTotals) **[coordinate: backend/contract]** |
| W3-03 | 🟡 | S | **Fail-closed on unknown chain.** Chain guard switches to Celo (good), but verify escrow/token address lookups throw (not return `undefined`/zero address) on an unsupported `chainId`. (verify) | `hooks/useChainGuard.ts`, `hooks/useApproval.ts:44` |
| W3-04 | 🟡 | S–M | **Swap slippage bounds.** Confirm Mento/Uniswap swaps enforce a min-output / slippage cap and a deadline. (verify) | `hooks/useSwap.ts`, `hooks/swap/*` |
| W3-05 | 🟡 | M | **Tx UX hardening:** double-submit guard on Buy, pending/nonce handling, decoded revert reasons, pre-flight simulation. | `hooks/usePayment.ts`, `hooks/useEscrow.ts` |

**Positive:** chain-guard, per-`chainId` address resolution, and a payment debugger that redacts
private keys/mnemonics (`utils/debug/paymentDebugger.ts:215`) are already in place.

---

## 3. Performance & Speed

| ID | Sev | Effort | Finding |
|----|-----|--------|---------|
| PERF-01 | 🟡 | M | Ensure wallet/web3 SDKs (wagmi connectors, swap SDKs) are not in the initial bundle — lazy-load behind wallet interaction. 32 `React.lazy` split points already exist; verify connectors are among them. |
| PERF-02 | 🟡 | S–M | Image pipeline: serve Cloudinary responsive `srcset` + AVIF/WebP via `OptimizedImage`, explicit width/height to avoid CLS. (verify coverage) |
| PERF-03 | 🟡 | S | Add a **bundle-size budget** to CI and run an analyzer; `manualChunks` is configured (`vite.config.ts:152`). |
| PERF-04 | ⚪ | S | `preconnect`/`dns-prefetch` to API, Cloudinary, and RPC endpoints. |
| PERF-05 | 🟡 | M | Caching strategy: RTK Query cache tags are used well; define SW/runtime caching — stale-while-revalidate for catalog, network-first for orders/balances/quotes. |

**Targets:** mobile 4G — LCP < 2.5s, INP < 200ms, CLS < 0.1.

---

## 4. SEO  *(full crawl audit pending — per decision)*

| ID | Sev | Effort | Finding |
|----|-----|--------|---------|
| SEO-01 | 🟠 | L | **Meta/OG tags are injected client-side** (`useSEO` writes to `document.head` after load). Googlebot renders JS, but **social/link-preview scrapers (WhatsApp, X, Facebook, iMessage, Slack) do not** → product/share previews are blank, hurting marketing & referral traffic. Resolution (prerender vs SSR) to be chosen after the crawl audit. |
| SEO-02 | 🟡 | M | `useSEO` is on 5 pages (`Home, Product, SingleProduct, Community, ReferralLanding`). Confirm every indexable route (incl. category pages) emits canonical + OG + `Product`/`BreadcrumbList`/`Organization` JSON-LD. |
| SEO-03 | ⚪ | S | Verify product/category sitemaps auto-regenerate on catalog changes. |

**Positive:** thorough `robots.txt` (public routes allowed, auth/account/orders disallowed),
three sitemaps, `manifest.json`, and a sitemap-generation script already exist.

**Next:** dedicated SEO/crawl audit → evidence-based recommendation on **prerender key routes vs. SSR (Next.js)**.

---

## 5. Reliability & Observability

| ID | Sev | Effort | Finding |
|----|-----|--------|---------|
| REL-01 | 🟠 | M | **No error or performance monitoring** (Sentry/web-vitals). Production is blind. Add before other phases so fixes are measurable. |
| REL-02 | 🟡 | S | `ErrorBoundary` with a chunk-reload guard exists (good). Verify a global fallback + consistent API-error UX across journeys. |
| REL-03 | 🟡 | S | 401 handling clears localStorage token (`baseApi.ts:27-34`); revisit once auth moves to cookies. |

---

## 6. Code Quality & Maintainability

| ID | Sev | Effort | Finding |
|----|-----|--------|---------|
| CQ-01 | 🟡 | M | Two HTTP layers (`apiService` + RTK Query). Consolidate; delete the redundant one. |
| CQ-02 | 🟡 | S–M | `as any` casts around order body/providers now that backend shapes are known — tighten types. |
| CQ-03 | ⚪ | S | Dead code: `components/common/OrderStatusManager.tsx` is fully commented out. Remove. |

---

## 7. Testing & QA

| ID | Sev | Effort | Finding |
|----|-----|--------|---------|
| QA-01 | 🟠 | L | Only 2 test files (`useSwap`, `validation`). Add unit + integration coverage for critical paths (auth, checkout/escrow, orders, delivery addresses, logistics pricing) and Playwright E2E for each journey. |
| QA-02 | 🟠 | — | Tests aren't enforced — no CI (see OPS-01). |

---

## 8. DevOps / CI / Config

| ID | Sev | Effort | Finding |
|----|-----|--------|---------|
| OPS-01 | 🟠 | M | **No CI pipeline** (`.github/workflows` absent). Add: typecheck → lint → test → build → `npm audit`/Snyk → bundle budget, blocking merges. |
| OPS-02 | 🟡 | S | Netlify pins **Node 18** (past LTS EOL). Bump to 20/22 and add `engines` to `package.json`. |
| OPS-03 | 🟡 | M | No documented staging env / per-PR preview deploys. |
| OPS-04 | ⚪ | S | `.env.example` exists (good). Confirm no secret is expected in a `VITE_*` var (those are public in the bundle). |

---

## 9. Accessibility & UX

| ID | Sev | Effort | Finding |
|----|-----|--------|---------|
| A11Y-01 | 🟡 | M–L | Full WCAG 2.1 AA pass needed: keyboard nav, focus management on modals/forms, ARIA, and contrast on the dark theme (`#1a1c20`/`#292B30` + gray text — several gray-500/600 pairings risk failing 4.5:1). |
| UX-01 | 🟡 | per-journey | Standardize loading/empty/error/offline states across journeys (good patterns already exist in addresses/logistics work). |

---

## 10. Privacy & Compliance

| ID | Sev | Effort | Finding |
|----|-----|--------|---------|
| PRIV-01 | 🟠 | M | Once auth uses cookies (SEC-01), a **cookie-consent banner** + updated privacy/terms are required. Review GDPR/data-handling. **[coordinate: backend]** |
| PRIV-02 | 🟡 | S | Review Google OAuth scopes and stored PII (email, name, profile image, phone, address). |

---

## Prioritized roadmap

**P0 — foundations (do first, unblock everything):**
OPS-01 (CI) · REL-01 (monitoring) · SEC-02 (headers) · SEC-03 (sourcemaps) · SEC-05 (.gitignore/history) ·
SEC-01 spec (cookie auth) **[coordinate: backend]**.

**P1 — core hardening:**
Web3 W3-01…W3-05 · QA-01 (tests) · SEO audit → decision → implement · PERF-01…05 · PRIV-01.

**P2 — polish:**
A11Y-01 · CQ-01…03 · SEC-04/06/07 · OPS-02/03 · UX-01.

---

## Definition of Done (apply per user journey in the vertical sweep)

- [ ] Loading / empty / error / offline states; optimistic updates roll back on failure
- [ ] Client **and** server validation; no client-trusted amounts on paid actions
- [ ] Cache invalidation correct (RTK Query tags); no stale reads after mutations
- [ ] Double-submit / race guards (critical for on-chain actions; idempotency)
- [ ] WCAG AA: keyboard, focus, ARIA, contrast; mobile + dark mode
- [ ] Unit + integration tests (happy path + 2–3 failures) and a Playwright E2E
- [ ] No dead UI, no `as any`, copy reviewed
- [ ] SEO (indexable pages): canonical + OG + JSON-LD present in rendered HTML

---

## Open decisions

1. **SEO rendering** — pending the crawl audit: prerender key routes vs. migrate to SSR.
2. **Cookie-auth migration** — needs a backend spec; confirm the backend team's timeline.
3. **Sequencing** — start P0 as a batch, or tackle strictly top-down by severity.
