# Functional Requirements — Kids & Co. E-commerce (Baseline)

Baseline functional requirements describing current behavior. Future features add new specs under `specs/`.

## FR-01 Catalog Browsing
- Users can browse children's clothing products on the home and products pages.
- Products display name, price, image, and category.

## FR-02 Product Details & Variants
- Users can view a product detail page.
- Products support variants by color and size.

## FR-03 Shopping Cart
- Users can add products (with selected variant) to cart.
- Users can update quantities and remove items.
- Cart persists in browser storage (`localStorage`).

## FR-04 Checkout
- Users can enter customer and shipping details.
- Payment method: Cash on Delivery.
- Order totals are computed from cart items.
  (Baseline/current behavior. For order creation, FR-17 (target) supersedes: totals are
  authoritatively computed server-side; cart prices are reference only.)

## FR-05 Order Creation & Confirmation
- Submitting checkout creates an order and order items in Supabase.
- User is redirected to an order success page.

## FR-06 Order Tracking
- Users can track an order by identifier.

## FR-07 Contact
- Users can submit a contact message.
- Messages are stored in Supabase.

## FR-08 Admin Authentication
- Admins can log in.
- Admin routes under `/admin/*` (except login) are protected.

## FR-09 Admin Dashboard
- Admins see an overview dashboard.

## FR-10 Admin Product Management
- Admins can create, read, and update products (product deletion not implemented/verified in the service layer).

## FR-11 Admin Variant Management
- Admins can manage product variants: add, update, and delete variants and associated colors/sizes.

## FR-12 Admin Category Management
- Admins can create, update, and delete categories.

## FR-13 Admin Order Management
- Admins can list orders and update order status.

## FR-14 Admin Messages
- Admins can view submitted contact messages.

## FR-15 Responsive Design
- UI adapts to different screen sizes (mobile-friendly).

## FR-16 SPA Routing
- Client-side routing works on refresh/deep links via Vercel rewrite and `_redirects`.

## FR-17 Price-Change Approval at Checkout
- When a variant price or discount changes after add-to-cart, checkout must
  block order creation, show previous and new prices, and require explicit
  customer approval.
- After approval, cart is updated with the new price and revalidated.
- If the price changes again, a new approval is required.
- No trusted price or total is accepted from the client.
- Approval does not bypass final verification in the atomic order-creation
  operation.
- No order is created and no stock is deducted on rejection or failed
  verification.
- Shipping price changes are handled separately with the same approval and
  revalidation policy.

## Non-Functional
- NFR-01 Performance: reasonable load times for product images.
- NFR-02 Security: RLS on Supabase; no secret keys in client.
- NFR-03 Maintainability: follow existing component/service patterns.
## Verification Status
- FRs are derived from routes in `src/App.jsx` and service functions in `src/services/*`.
- Items requiring further verification:
  - FR-09 Admin Dashboard metrics/content.
  - FR-10/FR-11/FR-12 Admin CRUD completeness for products, variants, categories.
  - FR-10 Product deletion is not implemented in `adminProductService.js` (only `deleteProductImage` exists).
  - FR-13 Order status transitions and cancellation rules.
  - FR-14 Message read/delete workflows.
  - FR-16 Deployment fallback behavior on Vercel (config present; runtime not tested here).
- No `.env` or secrets were accessed.

## Product Discounts (Feature 003)
- FR-D1..D6: see `specs/003-product-discounts/spec.md` (product-level discount, window semantics, effective price rule).
- Variant-level discount requirements in `specs/001-variant-discounts` are superseded for the admin UI (see Feature 003).

