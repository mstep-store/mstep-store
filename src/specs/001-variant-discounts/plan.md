# Plan: 001-variant-discounts

## Approach
Add discount columns to `product_variants`. Expose them in product/admin
services. Compute effective price in a shared helper (client clock for display
only). Use effective price in detail/cart/checkout/listing. For order
creation, implement a trusted, atomic server-side operation that accepts
variant IDs + quantities (not prices/totals), fetches current prices and
discounts, uses DB `now()` for date evaluation, computes all amounts, and
inserts order + items atomically. Inspect current shipping/payment/stock
logic before DB changes to preserve behavior.

## Database Impact (apply separately, requires approval)
- Add to `product_variants`:
  - `discount_type text CHECK (discount_type IN ('percentage','fixed'))`
  - `discount_value numeric`
  - `discount_start_at timestamptz`
  - `discount_end_at timestamptz`
- Constraints (recommended):
  - If `discount_type` IS NOT NULL then `discount_value` IS NOT NULL.
  - percentage: 0 <= value <= 99 (effective price > 0).
  - fixed: 0 <= value < price (effective price > 0).
  - start_at <= end_at when both set.
  - On variant price update: validate existing fixed discount <= new price.
- Trusted order creation (choose after inspecting existing SQL/RLS):
  - Legacy/existing RPC `create_store_order` is inspected only and is NOT reused.
  - Target atomic SECURITY DEFINER RPC `submit_checkout_order` that:
    - Accepts customer details, variant IDs, quantities, shipping input.
    - Fetches current variant prices + discount config from DB.
    - Uses `now()` for discount date evaluation (start inclusive, end exclusive).
    - Calculates effective unit prices, line totals, subtotal, shipping, total.
    - Validates availability/stock per existing rules.
    - Inserts order + order_items atomically.
    - Preserves shipping rules and payment behavior (COD/unpaid).
  - Do NOT reuse any existing RPC without inspecting its actual SQL/behavior.
  - Prevent direct client inserts of arbitrary prices (RLS/permissions).
- RLS verification required for anon reads of discount columns (or RPC bypass).
  - No changes to `orders`/`order_items` schema within Feature 001 scope. (Feature 002 adds nullable governorate/city columns/snapshots separately.)
- Inspect current shipping calculation and payment behavior before DB changes
  (shipping currently 0 in Checkout.jsx; payment COD/unpaid).

## Shipping Rule Preservation
- The trusted order-creation operation must preserve the exact existing
  shipping rules and produce the same authoritative shipping amount stored
  in the order. Shipping is currently a constant 0 passed from Checkout.jsx;
  the trusted operation must replicate this rule unless a future spec changes it.

## Atomic Failure Rules
- Order creation must fail atomically if any selected variant is unavailable
  or has insufficient stock, following the existing stock rules
  (is_available and stock_quantity).

## Monetary Rounding Rule
- Calculate the discount, round the effective unit price to 2 decimal places using
  PostgreSQL `round(numeric, 2)`, and use that same value consistently for line
  totals and order totals.

## Price-Change Approval Flow
- Cart retains the added price as a comparison reference only.
- Checkout recalculates current variant prices/discounts from the DB.
- On mismatch, order creation is blocked and old vs new prices are shown.
- Explicit customer approval is required; approval is bound to the exact
  newly displayed prices.
- After approval, cart is updated with the new price and prices are revalidated.
- If the price changes again, a new approval is required.
- The final atomic operation recomputes prices from DB and compares them to
  approved values; client-sent `approved=true`, price, or total are never trusted.
- No order or stock changes occur on rejection or failed verification.

## RPC Migration Sequence (Coordinated)
- RPC naming: `create_store_order` = legacy/existing (inspect only); `submit_checkout_order` = target.
- Prepare `submit_checkout_order` alongside the existing `create_store_order`.
- Switch frontend to `submit_checkout_order`.
- Verify all flows (tamper, concurrency, stale approval, rollback).
- Revoke customer `EXECUTE` on `create_store_order` only after verification.
- Keep old RPC temporarily as internal reference until migration verification complete.
- No bypass window after cutover; rollback planning does not reopen the bypass.

## Files to Create
- `src/utils/pricing.js` — `getEffectivePrice(variant, nowMs)` helper.

## Files to Modify (requires approval per constitution §2)
- `src/services/productService.js` — select discount columns in
  `getProductById`; include purchasable variants in `getPublishedProducts`
  for listing accuracy.
- `src/services/adminProductService.js` — extend `addProductVariant`,
  `updateVariant`; add `clearVariantDiscount`; validate discount vs price.
- `src/pages/store/ProductDetails.jsx` — display effective price; store
  effective price in cart item.
- `src/pages/store/Products.jsx` — accurate discounted/"Starting from"
  presentation using only purchasable variants, or safe fallback.
- `src/pages/store/Cart.jsx` — show effective price.
- `src/pages/store/Checkout.jsx` — refresh/revalidate cart prices on entry;
  price-change approval UI (old vs new), cart update after approval;
  clearly show updated prices before submission.
- `src/services/orderService.js` — call trusted atomic order RPC instead of
  client-side inserts; handle validation errors.
- `docs/current-system.md`, `docs/functional-requirements.md` — document feature.

## Security Design Verification (before implementation)
1. Inspect existing `createOrder` flow and Supabase RLS for variants/orders.
2. Inspect any existing RPC definitions (do not assume reusability).
3. Determine anon read access to discount columns.
4. Choose atomic trusted RPC (or verified equivalent) accordingly.
5. Ensure no insecure direct-insert path remains for arbitrary prices.

## Data Flow
1. Admin sets discount → columns persisted; price updates revalidate discount.
2. Storefront reads columns → `getEffectivePrice` (client clock display only).
3. Listing computes min effective price over purchasable variants or fallback.
4. Cart stores effective price at add time.
5. Checkout refreshes variant prices from DB and shows changes.
6. Order creation calls trusted atomic RPC using DB time; charged prices are
   authoritative.

## Risks
- Client-trusted prices/totals could allow tampering if not revalidated server-side.
- Stock oversell under concurrent orders without atomic locking.
- RLS misconfiguration exposing inactive or admin data.
- Partial order state if trusted RPC unavailable.
- Rounding or discount edge cases producing negative prices.

## Rollback
- Set discount columns to NULL (or drop with data loss) → effective price
  becomes variant price; behavior reverts.
- If the trusted atomic order-creation mechanism cannot be implemented
  safely, stop the feature implementation or use a verified trusted backend
  alternative. Never fall back to trusting client-supplied prices or totals.
