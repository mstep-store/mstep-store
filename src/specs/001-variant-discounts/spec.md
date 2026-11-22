# Spec: 001-variant-discounts — Product Variant Discounts

> **Status (2026-11-17):** product-level discounts were requested; see `specs/003-product-discounts`. The variant-level admin UI is cancelled; the trusted order RPC, `pricing.js` and the checkout approval flow of this spec are reused.

## Summary
Allow each product variant (color + size) to have one optional discount
(percentage or fixed amount) with optional start/end dates. Discounts apply
to the variant's own price. Expired/not-yet-active discounts are ignored
automatically (not deleted). Discounted prices are shown on listing cards
when accurately calculable, in the cart, and at checkout. Order creation
authoritatively calculates and persists prices in a trusted server-side
operation using database time.

## Scope
In scope:
- One discount configuration per variant (type, value, optional date window).
- Admin UI to set/edit/clear a discount.
- Storefront display of effective price (detail, cart, checkout, listing
  where accurately calculable).
- Atomic, trusted price calculation/persistence at order creation.
- Date semantics: start_at inclusive, end_at exclusive (database time).
- Rounding to 2 decimals; no negative prices.
- Revalidation of fixed discounts when variant price changes.

Out of scope:
- Product-level (non-variant) discounts.
- Coupon codes / cart-wide promotions.
- Multiple stacked discounts per variant.
- Discount analytics/reporting.
- Auto-deletion of expired discounts.

## User Stories
- As an admin, I set a percentage or fixed discount on a specific variant.
- As an admin, I schedule a discount with optional start/end dates.
- As a customer, I see the discounted price (and original) on the product
  page, in cart, and at checkout.
- As a customer, listing cards show an accurate discounted/"Starting from" price.

## Functional Requirements
- FR-D1: Each variant has at most one discount configuration.
- FR-D2: Discount type is `percentage` or `fixed`.
- FR-D3: Percentage value is 0–99 (max 99% discount). Fixed value is >= 0 and < variant price;
  effective price must remain positive (> 0, never zero or negative).
- FR-D4: Optional `start_at`/`end_at` (UTC). start_at is inclusive,
  end_at is exclusive. All comparisons use database time for order creation.
  If both null, always active when configured. Outside window → ignored
  (not deleted).
- FR-D5: Discounts apply to the variant's own price, never `base_price`.
- FR-D6: Effective price = variant price when no active discount.
- FR-D7: Storefront displays effective price; original price shown when
  discounted.
- FR-D8: Listing cards show an accurate discounted/"Starting from"
  effective price considering only purchasable/available variants (existing
  availability and stock rules); otherwise fall back without claiming a discount.
- FR-D9: Cart stores effective price at add-to-cart time.
- FR-D10: On checkout entry, cart prices are refreshed/revalidated; if a
  price changed, the updated price is shown clearly before submission.
- FR-D11: Order creation authoritatively calculates and persists effective
  prices using database time, ignoring client prices/totals/clocks.
- FR-D12: Admin can clear a discount.
- FR-D13: When a variant's regular price is updated, any existing fixed
  discount is validated not to exceed the new price.
- FR-D14: The cart retains the actual price at which the item was added as a
  comparison reference only.
- FR-D15: At checkout, current variant prices and discounts are recalculated
  from the database.
- FR-D16: If a cart item's price differs from the recalculated price, order
  creation is blocked and both the previous and new prices are shown.
- FR-D17: Explicit customer approval is required before using the new price.
- FR-D18: After approval, the cart is updated with the new price and prices
  are revalidated against the database.
- FR-D19: If the price changes again before order creation, a new approval
  is required.
- FR-D20: The browser must never send a trusted price or trusted total.
- FR-D21: Customer approval is bound to the exact newly displayed variant
  prices; the final atomic operation recomputes price/discount from the
  database and compares them to the approved values. Client-sent
  `approved=true`, price, or total alone are never trusted.
- FR-D22: Customer approval does not bypass final verification inside the
  atomic order-creation operation.
- FR-D23: No order is created and no stock is deducted if the customer
  rejects or does not approve the new price.

## Non-Functional
- NFR-D1: No client-supplied price trusted at order creation.
- NFR-D2: Backward compatible: variants without discount columns behave as before.
- NFR-D3: Rounding to 2 decimals (EGP).
- NFR-D4: No negative effective prices.
- NFR-D5: Atomic order creation prevents partial/inconsistent price data.

## Acceptance Criteria
- AC-1: Admin can set/clear percentage or fixed discount with optional dates.
- AC-2: Discount applies only within active window (start inclusive, end
  exclusive, DB time); expired/future ignored.
- AC-3: Variant price (not base_price) is the discount base.
- AC-4: Storefront detail/cart/checkout use effective price.
- AC-5: Listing cards show accurate discounted/"Starting from" price or
  fallback (no false discount claims), considering only purchasable variants.
- AC-6: Checkout refreshes cart prices and clearly shows changes.
- AC-7: Order charged price matches DB-computed effective price (tamper test).
- AC-8: Fixed discount cannot yield negative price.
- AC-9: Updating variant price validates existing fixed discount.
- AC-11: No existing files modified beyond those listed in the plan.
- AC-12: Price change after approval but before order creation is detected and
  requires fresh approval.
- AC-13: Discount expiry/start/change triggers price revalidation and approval.
- AC-14: Multiple price changes require repeated approval.
- AC-15: Customer rejection prevents order creation and stock deduction.
- AC-16: Final atomic verification recomputes approved prices from DB.
- AC-17: No trusted price/total is accepted from the client.

Note: AC-10 is intentionally unused (not renumbered) to preserve existing references;
  criteria AC-11–AC-17 cover the remaining requirements.

## Traceability
- Variants: `src/services/productService.js`, `src/services/adminProductService.js`.
- Cart/checkout: `ProductDetails.jsx`, `Cart.jsx`, `Checkout.jsx`.
- Orders: `src/services/orderService.js` (`createOrder`), DB order creation.
- Admin UI: `src/pages/admin/ProductVariants.jsx`.
- Listing: `src/pages/store/Products.jsx`, `src/services/productService.js`.
