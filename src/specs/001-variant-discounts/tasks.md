# Tasks: 001-variant-discounts

- [ ] T1 Review and approve revised spec + plan.
- [x] T2 Inspect existing order creation flow, shipping, payment, and RLS.
- [x] T3 Inspect any existing RPC definitions; do not assume reusability.
- [x] T4 Decide trusted atomic order-creation mechanism based on verification.
- [x] T5 Apply DB migration (columns + constraints) (approval required).
- [x] T6 Implement/verify atomic trusted order RPC (approval required).
- [x] T7 Create `src/utils/pricing.js`.
- [x] T8 Update `productService` (detail + listing data).
- [x] T9 Update `adminProductService` (set/clear/validate discount; price-update validation).
- [-] T10 Update `ProductVariants.jsx` admin UI. (cancelled: replaced by product-level discount, Feature 003)
- [x] T11 Update `ProductDetails.jsx` (display + cart price).
- [x] T12 Update `Products.jsx` listing presentation (purchasable variants only).
- [x] T13 Update `Cart.jsx` display. (done in Feature 003)
- [x] T14 Update `Checkout.jsx` (refresh/revalidate + price-change approval + show changes).
- [x] T15 Update `orderService` to call trusted atomic RPC.
- [ ] T16 Update docs.
- [x] T17 Run `npm run lint`.
- [x] T18 Run `npm run build`.
- [ ] T19 Manual QA: percentage/fixed, date windows (inclusive/exclusive),
      listing, cart refresh, tamper test, price-update validation,
      no-discount preservation, shipping/payment preserved,
      atomic stock/availability failure, price change after approval,
      discount expiry/start/change, multiple price changes, rejection,
      no order/stock on failure.
- [ ] T20 Review git diff (additive + approved edits only).
