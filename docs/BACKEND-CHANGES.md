# DezenFoods — Backend Changes Required

> **Status (2026-10-05):** most of this has been built, with a different payment design: Pandascrow **virtual-account bank transfer** with payout on buyer confirmation, instead of Korapay and Pandascrow escrow (§0, §6 and §31 below describe the original plan). See [BACKEND-GAP-ANALYSIS.md](BACKEND-GAP-ANALYSIS.md) for what exists and what is left.

The DezenFoods frontend is a separate site that shares the DezenMart backend and login. This is everything the backend must add or change. Every endpoint below is **already called by the frontend** (see `src/store/api/*`); the request/response shapes here are the contract the UI was built against. The backend is the source of truth for prices, totals and payment state: **the browser never marks anything paid.**

Priority: **P0** = launch blocker, **P1** = needed soon after, **P2** = improvement.

Every request carries `X-Vertical: food` (`src/store/api/baseApi.ts`).

---

## 0. Payment providers: what the docs say, and what is still unconfirmed

Built only from the providers' published docs (fetched 2026-09-30).

**Korapay** (developers.korapay.com)
- Initialize: `POST https://api.korapay.com/merchant/api/v1/charges/initialize`, header `Authorization: Bearer <SECRET_KEY>`. Body: `amount` (integer), `currency`, `reference` (unique), `customer.email` (+ `customer.name`), optional `redirect_url`, `notification_url`, `narration`, `channels`, `default_channel`, `metadata` (max 5 fields, 20 chars each), `merchant_bears_cost`. Response `data.checkout_url`, `data.reference`. The reference is appended to `redirect_url` as `?reference=`.
- Webhook: header `x-korapay-signature` = HMAC-SHA256 of **only the `data` object**, keyed with the secret key. Events `charge.success|failed`, `transfer.success|failed`, `refund.success|failed`. Return `200` immediately; retries for 72h; dedupe events.
- Refund: `POST /merchant/api/v1/refunds/initiate` (`payment_reference`, `reference` ≤50 chars, optional `amount`, `reason`, `webhook_url`); `GET /refunds/:reference`; `GET /refunds`.
- Public key = client only; secret key = server only; test and live keys differ.
- **Not found in the pages I could read, confirm before building:** the verify-charge (query) endpoint, the sandbox base URL, and the payout request/response (`developers.korapay.com/docs/payout-via-api`). Do not guess these.

**Pandascrow** (pandascrow.readme.io, API v3)
- Hosts: sandbox `https://sandbox.pandascrow.io`, live `https://api.pandascrow.io`. Requires KYC/KYB before live.
- Auth is a `Token` header carrying your API key from the dashboard. **The auth page is vague. Confirm key type and header with Pandascrow support.** The docs pages show a sample key value: treat it as a placeholder, never use it.
- `POST /escrow/initialize`: required `uuid, escrow_type, initiator_role, initiator_id, title, currency, description, inspection_period, delivery_date, who_pay_fees, amount`. Returns `escrow_id, status, transaction_ref, provider, payment_method`, optional `payment_url` / `virtual_account`.
- `POST /escrow/complete` (`uuid, escrow_id, otp`): either party; OTP is sent to the confirming party. `POST /escrow/resend-otp` (`uuid, escrow_id`). `POST /escrow/dispute` (`uuid, escrow_id, reason`, optional `screenshot_url`). `GET /escrow/single` (`uuid` or email, `escrow_id`). Fetch-all exists.
- Webhook: header `X-Pandascrow-Signature` (HMAC-SHA256 over event data + timestamp + secret, timing-safe compare). Events `escrow.created`, `escrow.paid`, `escrow.completed`, `escrow.dispute.opened`, `invoice.paid`, `wallet.deposit.success`. Retries up to 72h.
- Amounts are in the lowest denomination (whole numbers).
- The exact `escrow_type`, `who_pay_fees`, `inspection_period` and `uuid` semantics were not fully documented in the pages read: confirm with Pandascrow.

**Architecture rule:** both providers need secret keys, so the frontend never calls them. The backend creates the charge/escrow, receives the webhooks, verifies, and updates the order.

---

## 1. Multi-vertical scope (P0)

1. Add `vertical: "marketplace" | "food"` to products, vendors, orders, categories. Default existing rows to `marketplace`. Filter every list/search/sitemap endpoint by the `X-Vertical` header (default `marketplace` when absent so DezenMart is unaffected).
2. CORS: allow the DezenFoods origin(s) and the `X-Vertical` header. Add the origin to the Google OAuth client's **Authorized JavaScript origins**, and to the allow-list used by `GET /auth/google?origin=` and the redirect back to `/auth/google?token=&userId=`.
3. Same users collection, one identity across both sites (see §11).

## 2. Categories (P0)

4. `categories` collection and endpoints: `GET /categories?vertical=food` (public), admin `POST/PUT/DELETE /categories`. Fields: `name, slug, emoji, blurb, subcategories[], sortOrder, isActive, vertical`.
5. Seed for food: Snacks, Small Chops, Groceries, Pepper Soup, Rice & Rice Meals, Drinks, Bakery, Other Food (matches `src/config/categories.json`).
6. Validate `product.category` (and `subcategory`) against it. Today it is a free string.

## 3. Products (P0)

7. Accept and store the new listing fields sent by `CreateProduct` (multipart `POST /products`, `PUT /products/:id`):
   `vertical`, `currency` ("NGN"), `subcategory`, `portionSize`, `serves`, `prepTimeMinutes` (required for food), `minOrderQty`, `spiceLevel`, `dietaryTags` (JSON array), `allergens` (JSON array), `availableDays` (JSON array of Mon..Sun), `orderCutoff` ("HH:mm"), `leadTimeHours`, `shelfLifeHours`, `fulfilment` (JSON array of `delivery|pickup`), `acceptedPayments` (JSON array of `korapay|pandascrow|crypto`).
8. Make `sellerWalletAddress`, `tradeParams`, `tokenAddress`, `paymentToken` **optional**: fiat-only vendors have no wallet and no on-chain trade. Only create the on-chain trade when `acceptedPayments` includes `crypto`.
9. Price for food is stored in NGN. Return `currency` on every product.
10. Enforce: description min length, price > 0, stock > 0, `minOrderQty <= stock`, at least one image, seller is an **approved** vendor (§4).
11. Stock: reserve on order creation, release on cancel/expiry/decline, decrement on paid. Reject orders exceeding stock or below `minOrderQty`, outside `availableDays`, or after `orderCutoff`.
12. Include `seller._id, name, rating, profileImage` (already used) and vendor `isOpen` on product responses so closed vendors can be flagged.

## 4. Vendors (P0)

13. `vendors` collection: `user, businessName, description, categories[], phone, state, lga, address, logo, coverImage, openingHours{days,open,close}, isOpen, status (pending|approved|rejected|suspended), rejectionReason, rating, reviewCount, payoutAccount`.
14. Endpoints:
    - `POST /vendors/apply` (body in `vendorsApi.ts`: includes `payout: {bankCode, accountNumber}`)
    - `GET /vendors/me` → **404 when the user has no application** (the UI relies on this)
    - `PUT /vendors/me` (edit profile, `isOpen` toggle)
    - `GET /vendors/:id` public storefront (enveloped `{data:{vendor}}` or bare)
    - `GET /vendors/banks` list of banks `[{code,name}]`
    - `POST /vendors/banks/resolve` `{bankCode, accountNumber}` → `{accountName}` (server-side bank name lookup)
15. Payout account: store encrypted; return only `{bankName, accountName, accountNumberMasked}` and only to the vendor and admins. Never log it.
16. Set `user.isMerchant`/`role: "vendor"` on approval; add `role` (`user|vendor|admin`) to the user profile response.
17. Notify the vendor on approve/reject (in-app + email).

## 5. Orders (P0)

18. `POST /orders` for `vertical: "food"` accepts `items[] {product, quantity, variantIndex?, note?}`, `fulfilment`, `quoteId?`, `deliveryAddress?`, `buyerNote?`, `scheduledFor?`. All items must be from **one vendor**.
    Server computes `totals {subtotal, deliveryFee, serviceFee, total}` in NGN from product ids and the logistics quote. Ignore any client price. Return the order with `totals`, `items[] {product,name,image,quantity,unitPrice,variantLabel,note}`, `currency:"NGN"`, `status:"awaiting_payment"`, `paymentRail` (null until paid). Support an idempotency key.
19. Extended status machine (only the backend moves it):
    `awaiting_payment → paid → preparing → ready → out_for_delivery → delivered → completed`, plus `rejected`, `cancelled`, `disputed`, `refunded`. Keep legacy statuses working for marketplace orders.
    - `paid` set **only** by a verified payment (webhook/verify), never by `PUT /orders/:id` from a client.
    - Vendor must accept within N minutes or the order auto-cancels and auto-refunds.
    - Auto-complete N hours after `delivered` if the buyer does not act (define window; Pandascrow has its own `inspection_period`).
20. **Lock down `PUT /orders/:id`**: today the browser could set `status: "accepted"`. For fiat orders reject client status writes entirely; validate role and transition for everything else. (The old mock flow depended on this hole.)
21. `POST /orders/:id/vendor-action` `{action: accept|reject|preparing|ready, reason?, prepTimeMinutes?}`: vendor only, own orders only, valid transitions only. `reject` triggers refund.
22. `POST /orders/:id/cancel` `{reason?}`: buyer, only before the vendor starts preparing; triggers refund.
23. `GET /orders?type=seller` must return food orders with items and buyer note (vendor queue polls it every 20s).
24. Order fields the UI reads: `paymentRail`, `paymentReference`, `currency`, `totals` (with optional `totals.crypto {token, amount}` for the authoritative crypto amount), `items`, `fulfilment`, `buyerNote`, `prepTimeMinutes`, `releaseOtpRequired`, `dispute.reason`.

## 6. Fiat payments (P0)

25. `GET /payments/methods` → `{data:{methods:[{provider:"korapay"|"pandascrow"|"crypto", enabled, label, blurb?, currencies?}]}}`. The UI shows only enabled rails, intersected with what the vendor accepts. Disabled/unconfigured = not returned or `enabled:false`.
26. `POST /payments/fiat/initialize` `{orderId, provider, email, returnUrl}` → `{data:{reference, provider, checkoutUrl?, virtualAccount?{bankName,accountNumber,accountName,expiresAt}, amount, currency}}`.
    - Validate: caller owns the order, order is `awaiting_payment`, amount comes from the order, not the request. **Allow-list `returnUrl` origins.**
    - Korapay: call `charges/initialize` with a unique `reference`, integer NGN amount, `customer`, `redirect_url = returnUrl`, `notification_url = <your webhook>`, small `metadata`. Return `checkout_url` as `checkoutUrl`.
    - Pandascrow: call `/escrow/initialize` (amount in lowest denomination), store `escrow_id` + `transaction_ref`, return `payment_url` as `checkoutUrl` or the `virtual_account`. Normalise the shape: the UI does not depend on provider fields.
    - `checkoutUrl` must be https.
27. `GET /payments/:reference/status` → `{data:{reference, status: pending|success|failed|expired, orderId, orderStatus?, provider?}}`. Status is what **you** verified with the provider (webhook or a server-side verify call), never a value from the client or URL. The UI polls this every 4s for up to 10 minutes.
28. Webhooks (public, raw body, rate-limited, respond `200` quickly, idempotent by event/reference, keep an event log):
    - **Korapay**: verify `x-korapay-signature` (HMAC-SHA256 of the `data` object with the secret). On `charge.success` confirm reference, amount and currency match the order before marking paid. Handle `charge.failed`, `refund.*`, `transfer.*`.
    - **Pandascrow**: verify `X-Pandascrow-Signature` per their scheme. Handle `escrow.paid` (→ order `paid`), `escrow.completed` (→ release recorded), `escrow.dispute.opened`.
    - Also verify with the provider directly (Korapay query endpoint: confirm in their docs) rather than trusting the webhook alone.
29. Payment ledger collection: `provider, reference, orderId, amount, fee, currency, status, escrowId?, rawEvents[], createdAt`. Reconciliation job; expire unpaid payments and orders; alert on amount/currency mismatch.
30. **Escrow semantics differ by rail:**
    - **Pandascrow** holds the funds. Release = `POST /escrow/complete` with the buyer's OTP; dispute = `POST /escrow/dispute`.
    - **Korapay is a plain pay-in**, so DezenFoods holds the money in its own balance. Track a `held` ledger entry, release to the vendor by payout after the buyer confirms (or auto-release), refund via the Refunds API. Payout needs the Korapay payout docs (see §0). **Holding customer funds needs finance/legal sign-off and a clear terms page.**
    - Crypto keeps the existing contract flow.
31. `POST /orders/:id/confirm-delivery` `{otp?}`: buyer only; Pandascrow orders require OTP and call `/escrow/complete`; Korapay orders trigger vendor payout; sets `completed`.
    `POST /orders/:id/release-otp/resend`: calls Pandascrow `/escrow/resend-otp`.
    `POST /orders/:id/dispute` `{reason, screenshotUrl?}`: sets `disputed`, forwards to Pandascrow `/escrow/dispute` when applicable, freezes payout.
32. Platform commission and service fee settings; vendor settlement = subtotal − commission; records per order.
33. Config/env (never in the frontend): `KORAPAY_SECRET_KEY`, `KORAPAY_PUBLIC_KEY`, `KORAPAY_BASE_URL`, `PANDASCROW_API_KEY`, `PANDASCROW_BASE_URL` (sandbox|live), webhook secrets, public webhook URLs. Complete Pandascrow KYC/KYB before live. Register webhook URLs in both dashboards. Separate test/live keys per environment.
34. Keep `paymentRail: "crypto"` on the existing `/contracts/*` flow; order records which rail was used.

## 7. Delivery and logistics (P0/P1)

35. (P0) `POST /logistics/quotes` for `vertical=food` returns fees in **NGN**. The UI formats delivery fees as NGN for food. Uses the vendor's `state/lga` as origin and total weight.
36. (P1) Perishable/same-day support: pickup time = prep time, delivery windows, distance pricing, food-capable provider flag, notify the provider when the order is `ready`, status updates to `out_for_delivery` / `delivered`, proof of delivery (photo or PIN).
37. (P1) Pickup fulfilment: no logistics; share the vendor address with the buyer after acceptance.

## 8. Disputes and admin (P0)

38. Admin role + RBAC on `/admin/*` (the UI hides the route, the backend must enforce):
    - `GET /admin/vendors?status=pending`, `POST /admin/vendors/:id/review` `{status: approved|rejected|suspended, reason?}`
    - `GET /admin/disputes`, `POST /admin/disputes/:orderId/resolve` `{resolution: release_to_vendor|refund_buyer, note?}` (calls the right provider: release/complete, payout, or refund)
    - `GET /admin/orders?status=`
39. Audit log for every admin action and every money movement.
40. (P1) Food-specific dispute reasons and evidence upload (image storage), evidence visible to admin.

## 9. Notifications (P1)

41. New types/templates: order placed, payment confirmed, vendor new order (high priority push), accepted/declined, preparing, ready, out for delivery, delivered, release OTP, dispute opened/resolved, refund issued, payout sent, vendor approved/rejected. Email + push (+ SMS optional).
42. Push payload titles use the brand name (frontend `sw.ts` falls back to "DezenFoods").

## 10. Reviews and discovery (P1/P2)

43. (P1) Reviews for food orders; aggregate `rating`/`reviewCount` per vendor and expose on `GET /vendors/:id`.
44. (P1) Product list filters: `category`, `subcategory`, `dietary`, `maxPrice`, `openNow`, `state/lga`, `vendor`. Search over name, description, vendor.
45. (P2) Favourite vendors, reorder from a past order, promo codes, delivery-time scheduling (`scheduledFor`), ratings per item.

## 11. Identity and security (P0/P1)

46. (P0) One user record across DezenMart and DezenFoods; same Google client. Both sites use their own token in localStorage today.
47. (P1) Move to httpOnly, Secure, SameSite cookies (audit SEC-01) on a shared parent domain to get true SSO and remove tokens from JS. Needs CSRF protection.
48. Rate-limit auth, payment initialize/status, OTP endpoints. Validate all input. Encrypt bank details at rest. Never trust client totals (audit W3-02).
49. Terms: add food/escrow terms via the existing `/terms/current?type=` endpoints, including the rule about Korapay funds being held by DezenFoods.

## 12. SEO and ops (P1/P2)

50. Vendor and product data endpoints used by the Netlify SEO edge function: `GET /products/:id`, `GET /vendors/:id`, `GET /products` (all honour `X-Vertical: food`).
51. Webhook delivery log, alerting on failed payments/webhooks/payouts, health checks, structured logs with order and payment references.

---

## Order of work suggested for the backend

1. §1, §2, §3, §4 (scope, categories, product fields, vendors)
2. §5 orders + §20 lockdown
3. §6 payments (Korapay pay-in first; confirm docs gaps in §0), webhooks, ledger
4. §6 Pandascrow escrow + OTP release + disputes
5. §7 logistics NGN quotes, §8 admin
6. §9 notifications, §10 discovery, §11 cookies/SSO
