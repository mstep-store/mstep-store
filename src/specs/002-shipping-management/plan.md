# Plan: 002-shipping-management

## Approach
Add governorate/city tables and nullable FK + snapshot columns to orders.
Expose public read for active entities and admin CRUD. Add admin UI page and
nav link. Update checkout with cascading dropdowns and price display. Order
creation validates city and price via trusted atomic operation (depends on
Feature 001 trusted order-creation design). Preserve COD/unpaid behavior.
Preserve existing `shipping_address` and all existing shipping data.

## Database Impact (apply separately, requires approval)
- `governorates`:
  - id (pk), name (text, unique, not null), is_active (boolean default true),
    created_at, updated_at.
- `cities`:
  - id (pk), governorate_id (fk → governorates.id, not null),
    name (text, not null), shipping_price (numeric, not null, >= 0),
    is_active (boolean default true), created_at, updated_at.
  - unique (governorate_id, name).
- `orders` (additive, nullable for backward compat):
  - shipping_governorate_id (fk → governorates.id, nullable)
  - shipping_city_id (fk → cities.id, nullable)
  - shipping_governorate_name (text snapshot, nullable)
  - keep shipping_city (existing text) as city name snapshot
  - keep shipping_cost (applied amount)
  - keep shipping_address and all existing shipping data
- RLS:
  - Public/anon SELECT on governorates where is_active = true.
  - Public/anon SELECT on cities where is_active = true (and governorate active).
  - Admin (store_admins) full CRUD on governorates/cities.
  - Orders: existing policies unchanged; trusted RPC handles inserts.
- Trusted order creation:
  - Use atomic SECURITY DEFINER RPC (target: submit_checkout_order; legacy create_store_order inspected only) (aligned with Feature 001) that:
    - Accepts governorate_id + city_id (not shipping price).
    - Validates city is active and belongs to active governorate.
    - Fetches current shipping_price from DB.
    - Verified fallback row exists: `الشرقية | city = '' | shipping_cost = 65.00 | is_active = true`.
    - Read-only verification note: repository contains no DB migrations/constraints; cities.name is declared text, not null with unique (governorate_id, name). Whether an empty city (city = '''') is allowed cannot be confirmed from code/DB here; treat fallback row as verified data only, not proof of a permissive constraint.
    - Validates variant availability/stock (existing rules).
    - Computes subtotal/shipping/total.
    - Inserts order + items atomically with snapshot names and applied price.
  - Do not reuse any existing RPC without inspecting its actual SQL.
  - Prevent direct client inserts of arbitrary shipping/prices.

## Public Read Policy Verification
- Public/anon SELECT must expose active governorates and active cities only
  when their parent governorate is also active.
- Verify actual RLS behavior (not just frontend filtering) before relying on it.
- Admin writes require `store_admins` membership, not authentication alone.

## No Destructive Deletion
- Governorates or cities referenced by orders must not be physically deleted.
- Use deactivation to retire entities. Preserve historical snapshots and
  foreign-key integrity.

## Historical Order Display
- Admin Orders and TrackOrder must display stored snapshot names and the
  stored `shipping_cost`. They must not depend on current governorate/city
  names.
- Old orders with null new IDs/snapshots remain readable via existing fields.

## Shipping Price-Change Approval
- If the shipping cost changes after the customer sees it, block order
  submission and show the updated shipping cost for explicit customer approval.
- Shipping approval is independent from product price approval, even when
  displayed together.
- The final atomic operation reads and validates the current shipping price
  from the database.
- Never trust client-supplied shipping cost.
## Snapshot Preservation
- `shipping_governorate_name` stores the governorate name at order creation.
- `shipping_city` (existing column) stores the city name at order creation.
- Later renames of governorates/cities do not affect historical order display.
- IDs provide traceability; snapshots provide history.

## Existing Data Preservation
- `orders.shipping_address` and all existing shipping-related data remain
  unchanged and readable.
- Existing orders without new governorate/city IDs remain readable and
  unchanged (nullable FKs).

## Admin Authorization
- Reuse the project's actual `store_admins` authorization mechanism
  (verified in `AuthContext.jsx`: admin check queries `store_admins` by
  `user_id`). Do not assume authentication alone grants admin rights.
- Admin CRUD and RLS must check `store_admins` membership, not just session.

## Atomic Order Creation Requirement
- Feature 001 and Feature 002 must use one trusted atomic order-creation
  operation. It validates variant prices, discounts, availability, stock,
  governorate/city relationship and active status; fetches the current city
  shipping price; calculates all totals; and inserts the order and order items
  in one transaction. No separate operation may leave a partially validated order.
- If this trusted operation is unavailable, block order submission and report
  the issue. Never fall back to client-trusted prices or shipping costs.
## Files to Create
- `src/pages/admin/Shipping.jsx` — admin management page.
- `src/services/shippingService.js` — governorate/city CRUD + public reads.

## Files to Modify (requires approval per constitution §2)
- `src/App.jsx` — add `/admin/shipping` route (protected).
- `src/layouts/AdminLayout.jsx` — add nav link.
- `src/pages/store/Checkout.jsx` — cascading dropdowns, price display, total.
- `src/services/orderService.js` — call trusted atomic RPC with city ID;
  handle validation errors.
- `docs/current-system.md`, `docs/functional-requirements.md` — document feature.

## Security Design Verification (before implementation)
1. Inspect existing `createOrder` flow and Supabase RLS for variants/orders.
2. Inspect any existing RPC definitions (do not assume reusability).
3. Verify anon read access for active governorates/cities.
4. Verify atomic RPC validates city/governorate active status.
5. Ensure no insecure direct-insert path for shipping prices.
6. Verify `store_admins` authorization is used for admin writes.

## Data Flow
1. Admin manages governorates/cities → DB.
2. Checkout loads active governorates; on selection loads active cities.
3. City selection sets shipping price; total updates.
4. Governorate change clears city + price.
5. Order creation calls trusted RPC with city ID; DB fetches price and
   stores applied amount + snapshots.

## Risks
- RLS misconfiguration exposing inactive or admin shipping data.
- Direct client inserts if trusted RPC is bypassed.
- Historical display depending on current names if snapshots missing.
- Stock oversell under concurrent orders.
- Trusted RPC unavailability blocking checkout.

## Rollback
- Deactivate governorates/cities (soft) to immediately block new usage.
- Revert code changes; checkout returns to previous behavior (free shipping)
  only if trusted mechanism remains intact. Never trust client prices.
- Drop new tables/columns as last resort (data loss).
- If the trusted atomic order-creation operation is unavailable, block order
  submission and report the issue. Never revert to a client-trusted order
  creation path.
