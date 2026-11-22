# Plan: 003-product-discounts

## Order of rollout (important)
1. Apply `supabase/migrations/20261117000001_product_discounts.sql` in the Supabase SQL Editor FIRST. It is safe with the currently deployed frontend: no product has a discount yet, so prices do not change.
2. Deploy the new frontend. (Deploying it before step 1 breaks product queries because `products.discount_*` would not exist yet.)
3. Set a discount on one product from the admin and run the manual QA below.
4. Rollback: deploy the previous frontend, then run `supabase/rollback/20261117000001_product_discounts_rollback.sql`.

## Database
- `products`: `discount_type`, `discount_value`, `discount_start_at`, `discount_end_at` + CHECK constraints (type, value required, percentage 0-99, fixed >= 0, window order).
- `submit_checkout_order` re-created (grants preserved): reads the discount from `products`, ignores a discount that would make the price <= 0, shipping still 0, COD/unpaid.
- RLS/grants: no change needed; anon already has SELECT on `products` for published rows and authenticated admins already UPDATE through existing policies (table-level grants cover new columns).

## Files
Created: `src/components/store/PriceTag.jsx`, migration + rollback SQL, specs 003/004.
Modified: `src/utils/pricing.js`, `productService.js`, `adminProductService.js`, `store/Products.jsx`, `store/Home.jsx`, `store/ProductDetails.jsx`, `store/Cart.jsx`, `store/Checkout.jsx`, `admin/Products.jsx`, `home/BestSellers.jsx`, `docs/current-system.md`, `docs/functional-requirements.md`, `specs/001-variant-discounts/{spec,tasks}.md` (status notes).

## Manual QA checklist
- Percentage and fixed discount on a product with 2+ variants of different prices.
- Window: future start (not applied), past end (not applied), end exactly now (not applied).
- Fixed discount >= cheapest variant price is rejected by the admin form.
- Home, Products, Best Sellers show discounted + original price; sorting by price uses the discounted price.
- Product page: price changes per selected variant; cart shows strike-through; quantity change keeps prices.
- Checkout: edit `cart[].price` in localStorage -> price-change notice; approve -> order total equals DB price.
- Change the discount in admin after adding to cart -> checkout asks for approval.
- Place an order: `orders.total` and `order_items.unit_price` match the discounted price; stock decreases.
- Product without discount: unchanged everywhere.
