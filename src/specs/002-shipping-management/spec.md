# Spec: 002-shipping-management — Governorate, City & Shipping Price Management

## Summary
Introduce governorate/city shipping management: admins manage governorates
(no price) and cities (each with its own shipping price and active status).
Customers select governorate then city; shipping price appears only after
city selection and updates the checkout total. Order creation authoritatively
validates the selected active city and its current shipping price. Orders
preserve the applied shipping amount and historical governorate/city names.
Existing `shipping_address` and all existing shipping data are preserved;
existing orders without new governorate/city IDs remain readable and unchanged.

## Scope
In scope:
- Admin CRUD for governorates (add/edit/activate/deactivate).
- Admin CRUD for cities per governorate (add/edit/activate/deactivate, price).
- Customer governorate→city cascading selection in checkout.
- Shipping price display after city selection; total recalculation.
- Authoritative shipping price validation during order creation.
- Historical snapshot of governorate/city names and applied shipping cost.
- Inactive entities blocked from new orders.

Out of scope:
- Weight/dimension-based shipping.
- Multiple shipping methods or carriers.
- International shipping.
- Shipping discounts/promotions.
- Automated tax calculation.

## User Stories
- As an admin, I manage governorates and their cities with individual prices.
- As an admin, I activate/deactivate a governorate or city without deleting it.
- As a customer, I select governorate then city; shipping price appears after
  city selection and updates the total.
- As a customer, changing governorate clears city and shipping price.
- As a system, order creation uses the DB's current city shipping price.

## Functional Requirements
- FR-S1: Governorates have no shipping price.
- FR-S2: Each city belongs to exactly one governorate and has its own
  shipping price and active status.
- FR-S3: Governorate names are unique.
- FR-S4: City names are unique within a governorate.
- FR-S5: Customer selects governorate first; only active cities of the
  selected active governorate are shown.
- FR-S6: Shipping price appears only after a city is selected.
- FR-S7: Changing governorate clears selected city and shipping price.
- FR-S8: Checkout total = subtotal + selected city shipping price.
- FR-S9: Inactive governorates/cities cannot be used for new orders.
- FR-S10: Orders store applied shipping amount and historical
  governorate/city names.
- FR-S11: Historical snapshots preserve governorate/city names at order
  creation time; later renames do not affect historical order display.
- FR-S12: Existing `shipping_address` and all existing shipping data are
  preserved; existing orders without new governorate/city IDs remain
  readable and unchanged.
- FR-S13: Cash-on-delivery and unpaid payment behavior preserved.
- FR-S14: Shipping price changes are handled separately from product price
  changes. If the shipping cost changes after the customer sees it, order
  submission is blocked and the updated shipping cost is shown for explicit
  customer approval.
- FR-S15: The final atomic operation reads and validates the current shipping
  price from the database; client-supplied shipping cost is never trusted.
- FR-S16: Shipping approval is tracked/verified independently from product
  price approval, even when displayed together.
- FR-S17: A single trusted atomic order-creation operation validates variant
  prices, discounts, availability, stock, governorate/city relationship and
  active status; fetches the current city shipping price; calculates all
  totals; and inserts the order and order items in one transaction. No
  separate operation may leave a partially validated order.
- FR-S18: Governorates or cities referenced by orders are never physically
  deleted; deactivation is used. Historical snapshots and foreign-key
  integrity are preserved.
- FR-S19: Admin Orders and TrackOrder display stored snapshot names and the
  stored shipping_cost; they do not depend on current governorate/city names.
  Old orders with null new IDs/snapshots remain readable via existing fields.

## Non-Functional
- NFR-S1: No client-supplied shipping price trusted at order creation.
- NFR-S2: Backward compatible: existing orders without new FKs remain valid.
- NFR-S3: Public read limited to active governorates/cities.
- NFR-S4: Admin-only writes.
- NFR-S5: Public read policies allow active governorates and active cities only
  when their parent governorate is also active; RLS behavior must be verified,
  not assumed from frontend filtering.

## Acceptance Criteria
- AC-S1: Admin can add/edit/activate/deactivate governorates.
- AC-S2: Admin can add/edit/activate/deactivate cities with prices.
- AC-S3: Governorate has no price field.
- AC-S4: City dropdown filters by selected active governorate.
- AC-S5: Shipping price shows only after city selection.
- AC-S6: Changing governorate clears city and price.
- AC-S7: Total updates with selected city price.
- AC-S8: Inactive entities cannot be selected/used.
- AC-S9: Order stores applied shipping amount and historical names.
- AC-S10: Historical names remain unchanged after later renames.
- AC-S11: Existing orders remain readable/unchanged.
- AC-S12: Existing `shipping_address` preserved.
- AC-S13: Tampered shipping price does not affect charged amount.
- AC-S14: `npm run lint` and `npm run build` pass.
- AC-S15: A single atomic trusted operation validates prices, discounts,
  availability, stock, governorate/city, and shipping; partial orders cannot occur.
- AC-S16: Public RLS verified to expose only active cities with active parent
  governorates.
- AC-S17: Referenced governorates/cities cannot be physically deleted; deactivation
  used; historical snapshots intact.
- AC-S18: Orders display uses stored snapshots and stored shipping_cost; old
  orders with null new fields remain readable.
- AC-S19: If trusted atomic operation unavailable, order submission is blocked
  and reported; no client-trusted fallback.
- AC-S20: Shipping price change after approval requires fresh approval.
- AC-S21: Product and shipping price changes together are handled with
  independent approvals.
- AC-S22: Customer rejection of any price/shipping change prevents order
  creation and stock deduction.
- AC-S23: Final atomic verification reads current shipping price from DB.

## Traceability
- AC-S20–AC-S23 correspond to FR-S14–FR-S17 (and FR-D23 for rejection handling); no separate FR-S20/FR-S22 identifiers are defined.
- Checkout: `src/pages/store/Checkout.jsx`.
- Orders: `src/services/orderService.js`, `src/pages/admin/Orders.jsx`,
  `src/pages/store/TrackOrder.jsx`.
- Admin nav/routes: `src/layouts/AdminLayout.jsx`, `src/App.jsx`.
- DB: `governorates`, `cities`, `orders` (existing + additive).
