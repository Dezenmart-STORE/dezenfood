# DezenFoods ↔ dezenmart-backend: status

Backend: `/home/omokorede/Documents/personal/dezenmart-backend`, branch `feat/food-vertical` (3 commits on top of `a6cc89c`). Updated 2026-10-05.

**The backend can now power DezenFoods**, with the gaps listed under "Before go-live". It was not usable as it stood (see "What was wrong"). The original contract is [BACKEND-CHANGES.md](BACKEND-CHANGES.md); where this document and that one disagree, this one reflects what was built.

## Payment model (decided)

Bank transfer through Pandascrow virtual accounts. No Korapay, no crypto, no hosted escrow for food.

1. Buyer places an order (`awaiting_payment`, stock reserved).
2. `POST /payments/fiat/initialize` creates a **one-time virtual account for the exact order total** (`POST /dva/create`). The buyer transfers to it.
3. Pandascrow moves the deposit into the platform master wallet on its side and calls our webhook. We mark the order `paid` only if the signature verifies, the reference matches a payment we created, and the amount covers the total.
4. Vendor accepts, prepares, marks ready / out for delivery / delivered.
5. **Buyer confirms receipt** → we pay the vendor's bank account from the master wallet (`POST /wallet/payout`): **subtotal − commission**. Delivery and service fees stay with the platform.
6. Money back to a buyer (declined, cancelled, vendor no-show, dispute, late payment) is a payout to a bank account the buyer gives us (`POST /orders/:id/refund-account`). Pandascrow documents no refund API for deposits, so this is how refunds work.

## What was built

Backend (all covered by tests, see below):

| Area | Change |
|---|---|
| Vertical scoping | `vertical` on products and orders (default `marketplace`), `X-Vertical` middleware, every product read path, watchlist and order lists filtered. Missing header = marketplace, so DezenMart is unaffected. Legacy documents without the field count as marketplace; `scripts/backfill-vertical.ts` tags them. |
| `/foods` | Left as is. |
| Listings | `POST/PUT /products` under `X-Vertical: food`: fiat-only (no wallet, no on-chain trade), food fields, category validated, approved vendors only, ownership enforced. Only the `pandascrow` rail is stored. |
| Vendors | `/vendors/apply`, `/me` (404 until applied), `PUT /me`, `/banks`, `/banks/resolve`, public `/vendors/:id`. Account holder name comes from the bank, account number is AES-256-GCM encrypted and only ever returned masked. |
| Admin | `/admin/vendors`, `/vendors/:id/review`, `/disputes`, `/disputes/:id/resolve`, `/orders`, `/orders/:id/retry-money`. Admin role enforced. |
| Orders | Multi-item, single-vendor, server-priced (client prices ignored), idempotency key, atomic stock reservation, availability days / cut-off / lead time / min qty, delivery fee from a server-held quote. Statuses `awaiting_payment → paid → preparing → ready → out_for_delivery → delivered → completed`, plus `rejected`, `cancelled`, `disputed`, `refunded`. Endpoints: `vendor-action`, `cancel`, `confirm-delivery`, `refund-account`, `dispute`. |
| Payments | `GET /payments/methods`, `POST /payments/fiat/initialize` (reuses an open account, allow-lists `returnUrl`), `GET /payments/:reference/status`, `POST /payments/pandascrow/webhook` (signed, deduplicated, event log, underpay / wrong-currency / late-payment handling). |
| Sweeper | Every minute: expire unpaid orders and return stock; cancel and queue a refund when a vendor does not respond (30 min); auto-complete delivered orders the buyer never confirmed (48 h); retry failed payouts and refunds (max 5). Every step is an atomic claim, so running on several instances is safe. |
| Profile | `GET /users/profile` now includes `role` (`admin` / `vendor` / `user`). |

Security fixes made on the way (these affect the existing marketplace too):

- **Korapay webhook** failed open and hashed the wrong thing. Now verifies the `data` object with the secret key, timing-safe, fails closed. (Express ride bookings use it.)
- **Product update** had no ownership check: any logged-in user could edit any product, including `seller`. Now owner/admin only; `seller`, `vertical`, `tradeId`, `rating` cannot be changed.
- **`GET /orders/:id`** returned any order, with buyer email and phone, to any logged-in user. Now buyer, seller, assigned logistics provider or admin only.
- **`PUT /orders/:id`** cannot write food order status.
- Legacy order lists no longer include food orders.

Frontend:

- Vendor dashboard could not move an order past "ready", so no order could ever reach `delivered` or be paid out. Added "Out for delivery" / "Handed to customer" / "Mark delivered" (`src/utils/orderFlow.ts`).
- Buyer can confirm receipt once the food is out for delivery or ready for pickup.
- New refund-account form (`RefundAccountForm`) and `submitRefundAccount` endpoint.
- Product form sends only the `pandascrow` rail; `.env.example` sets `VITE_CRYPTO_ENABLED=off`.
- **Contract bug found by the e2e suite:** `advanceFoodOrder`, `cancelOrder`, `confirmFiatDelivery`, `raiseDispute`, `updateOrderStatus`, `reviewVendor` and `resolveDispute` were typed as returning an `Order`/`VendorProfile` but returned the raw `{status, data}` envelope. They now unwrap it.

## How it was tested

| Suite | Where | Result |
|---|---|---|
| Backend | `npm test` (vitest + supertest + in-memory Mongo; only Pandascrow's HTTP is mocked) | 59 pass |
| Frontend unit | `npm run test:run` | 76 pass |
| Frontend ↔ real backend | `npm run test:e2e:full` — boots the real `src/server.ts` with in-memory Mongo and a stub Pandascrow, then drives the frontend's actual RTK Query endpoints | 11 pass |
| Types / build | `tsc` both repos, `vite build` | clean |

Money-critical safeguards were checked by mutation (removing the underpayment check, the webhook signature check, and the double-payout guard each make a test fail). That exposed one gap, now covered: no test hit a second settlement of an already-paid order.

**Not tested:** against the real Pandascrow (stubbed from their docs; see below), image upload (Cloudinary), Google sign-in, browser rendering of the new screens (only the refund form has a component test), multi-instance concurrency beyond the in-process race tests.

## Before go-live

### Verify against the real Pandascrow sandbox (I could not)

These are taken from [pandascrow.readme.io](https://pandascrow.readme.io) and some details are not specified there. Each is a one-line change if wrong.

1. **Webhook signature**: docs say HMAC-SHA256 over JSON of `{event, data, timestamp}` in `X-PANDASCROW-SIGNATURE`. Exact serialisation is unstated. We accept that JSON or the raw body. Anything else is rejected (fail closed), so a mismatch shows up as 401s on every deposit.
2. **`wallet.deposit.success` payload**: the docs have no example for a virtual-account credit. We match on `data.reference`, `data.record_uuid` or `data.account_number` against the DVA we created, and read `data.amount` / `data.currency`. Confirm which fields arrive.
3. **Who `uuid` is and what `PANDASCROW_MASTER_WALLET_ID` is**: we send one configured platform `uuid` on `/dva/create`, `/bank/validate` and `/wallet/payout`.
4. **Payout**: HTTP 200 is treated as success; the response schema and any async status / fees are undocumented. There is no idempotency key in the API, so a timeout after a successful payout would leave the order `processing`, which is deliberately not auto-retried; reconcile by hand.
5. **Bank codes**: we use `bankCode` from `/bank/lists` for both validation and payout (docs mention 3-digit NUBAN codes in places and 6-digit in the list).
6. **Dynamic account expiry** is 1 hour (`expiry.hours`); the order's payment window follows it.
7. Complete Pandascrow KYB, register the webhook URL (`<API>/api/v1/payments/pandascrow/webhook`), and use separate test/live keys. The sample `Token` value in their docs is a placeholder; do not use it.

### Business and compliance decisions

- **Commission and service fee default to 0%** (`FOOD_COMMISSION_PERCENT`, `FOOD_SERVICE_FEE_PERCENT`). Set them.
- **DezenFoods holds buyer funds** in the master wallet until confirmation. Finance/legal sign-off and terms text (`/terms/current?type=`) are still needed.
- **Delivery fees are not paid out** to logistics providers; they stay in the master wallet. Provider payout and "notify the provider when ready" are not built, and the legacy provider flow (`/orders/logistics/me/*`) will not work for food orders (it requires an on-chain `purchaseId`). The vendor marks out-for-delivery / delivered meanwhile.
- Auto-cancel (30 min) and auto-complete (48 h) windows are env-configurable: `FOOD_VENDOR_ACCEPT_MINUTES`, `FOOD_AUTO_COMPLETE_HOURS`.

### Configuration and operations

- Set: `PANDASCROW_API_KEY`, `PANDASCROW_BASE_URL`, `PANDASCROW_UUID`, `PANDASCROW_MASTER_WALLET_ID`, `PANDASCROW_WEBHOOK_SECRET`, `VENDOR_DATA_KEY` (**required in production**, the server throws without it), `DEZENFOODS_FRONTEND_URL`. See `.env.example`.
- Add the DezenFoods origin to the Google OAuth client's authorized origins.
- Run `npx ts-node scripts/backfill-vertical.ts` once on the production database.
- Failed payouts / refunds retry automatically 5 times, then need `POST /admin/orders/:id/retry-money`. There is no alerting; add monitoring on `payout.status = failed` and `refund.status = failed`.

### Known gaps, not built

- Crypto and Korapay for food orders (the product form no longer offers them).
- Reviews for food orders, vendor rating aggregation (public vendor rating is the owner's `User.rating`), product filters (`dietary`, `openNow`…), promo codes, reorder.
- Email/push templates beyond in-app notifications.
- Cookie-based SSO and rate limiting (still none on auth, payment or webhook routes).
- `isMerchant` can still be self-set via `PUT /users/profile` (the marketplace relies on it). Food listing does not use it; it requires an approved vendor.
- The Quidax webhook has the same fail-open signature check the Korapay one had.
- Refunds need the buyer to supply a bank account, so a refund is not instant even when approved.

## What was wrong originally

The backend had no vertical scoping, a separate on-chain-only `/foods` model, no vendors, one-item orders, no fiat order payments, no admin routes, and the Korapay webhook / product update / order read holes above. `/foods` remains, untouched.
