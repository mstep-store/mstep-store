# Spec: 003-product-discounts - Product-Level Discounts

## Summary
Each product can have one optional discount (percentage or fixed amount) with an
optional start/end date. The discount applies to the price of every variant of
that product. Expired or not-yet-active discounts are ignored (not deleted).
Discounted prices show on listing cards, product page and cart; checkout
revalidates them and order creation recomputes everything on the server.

This feature replaces the variant-level admin flow of `001-variant-discounts`
(product-level discounts were out of scope there). Feature 001's DB trusted
order RPC, pricing helper and checkout approval flow are reused.

## Scope
In scope:
- Discount columns on `products`; admin form fields to set/edit/clear.
- Storefront display (listing, home, best sellers, details, cart).
- Checkout revalidation and price-change approval (existing flow, now reading the product discount).
- `submit_checkout_order` reads the discount from the product (database time).

Out of scope:
- Per-variant discounts (columns stay dormant), coupons, cart-wide promotions, stacked discounts.
- Shipping changes (Feature 002), discount analytics, auto-deleting expired discounts.

## Functional Requirements
- FR-P1: At most one discount per product: type `percentage` or `fixed`.
- FR-P2: Percentage > 0 and <= 99. Fixed > 0 and < the cheapest variant price (or base_price while the product has no variants).
- FR-P3: Optional `start_at` (inclusive) / `end_at` (exclusive); `start_at` < `end_at` when both set.
- FR-P4: Effective unit price = round(variant.price after discount, 2) using the variant's own price, never base_price.
- FR-P5: If a discount would make a price <= 0 (e.g. a variant price lowered below a fixed discount) it is ignored: the regular price applies, in both the storefront and the server.
- FR-P6: Listing cards show the cheapest purchasable variant's effective price, the original price struck through and a "-X%" badge; products with no purchasable variant fall back to base_price without a discount claim.
- FR-P7: Product page shows effective price, original price and badge for the selected variant; cart items keep `price` (effective at add time) and `original_price` (display only).
- FR-P8: Checkout refreshes variant price + product discount from the database; any difference blocks submission until the customer approves the new prices (existing flow).
- FR-P9: `submit_checkout_order` recomputes unit prices from the database with `now()`; client prices/totals are never trusted.
- FR-P10: Admin sets/clears the discount from the product form; the admin list shows the discount and its status (active / scheduled / expired).

## Non-Functional
- NFR-P1: Rounding to 2 decimals, identical on client (integer cents) and server (`round(numeric, 2)`).
- NFR-P2: Backward compatible: products without a discount behave exactly as before.
- NFR-P3: Shipping and payment (COD/unpaid) behavior unchanged.

## Acceptance Criteria
- AC-1: Admin can set/clear percentage or fixed discount with optional dates; invalid values are rejected with a clear message.
- AC-2: Discount applies only inside its window (start inclusive, end exclusive, DB time).
- AC-3: Every variant of the product shows the discounted price on the product page, cart and checkout.
- AC-4: Listing/home/best-seller cards show the discounted price and original price.
- AC-5: Order totals equal the server-computed prices (tamper test: edit cart prices in localStorage; order still uses DB prices).
- AC-6: Changing/expiring a discount between add-to-cart and checkout triggers the price-change approval.
- AC-7: A product without discount is unchanged in storefront and orders.

## Known Gaps
- The approval flow is enforced in the browser; `submit_checkout_order` does not receive the approved prices, so a price change between approval and submit is charged at the new DB price. (Spec 001 FR-D21/AC-16 would need an expected-total parameter; not part of this feature.)
- Dormant variant discount columns/code remain until a separate approved cleanup.

## Traceability
- DB: `supabase/migrations/20261117000001_product_discounts.sql`.
- Pricing: `src/utils/pricing.js`, `src/components/store/PriceTag.jsx`.
- Services: `src/services/productService.js`, `src/services/adminProductService.js`.
- Pages: `store/Products.jsx`, `store/Home.jsx`, `store/ProductDetails.jsx`, `store/Cart.jsx`, `store/Checkout.jsx`, `admin/Products.jsx`, `components/store/home/BestSellers.jsx`.
