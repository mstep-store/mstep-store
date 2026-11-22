# Tasks: 002-shipping-management

- [ ] T1 Review and approve spec + plan.
- [ ] T2 Inspect existing order creation, shipping, payment, RLS, RPCs.
- [ ] T3 Verify dependency on Feature 001 trusted order-creation design.
- [ ] T4 Verify `store_admins` authorization mechanism for admin writes.
- [ ] T5 Apply DB migration (tables + columns + constraints) (approval required).
- [ ] T6 Configure RLS policies (approval required).
- [ ] T7 Create `src/services/shippingService.js`.
- [ ] T8 Create `src/pages/admin/Shipping.jsx`.
- [ ] T9 Update `AdminLayout.jsx` nav link.
- [ ] T10 Update `App.jsx` route.
- [ ] T11 Update `Checkout.jsx` (cascading dropdowns + price + total).
- [ ] T12 Update `orderService.js` (trusted RPC with city ID).
- [ ] T13 Update admin Orders display (governorate/city names).
- [ ] T14 Update docs.
- [ ] T15 Run `npm run lint`.
- [ ] T16 Run `npm run build`.
- [ ] T17 Manual QA: CRUD, cascading, price display, total, inactive blocking,
      tamper test, existing orders readable, shipping/payment preserved,
      historical snapshot preservation, single atomic order creation,
      public RLS verification, no destructive deletion, rollback safety,
      shipping price change approval, combined product/shipping changes,
      rejection and no order/stock on failure.
- [ ] T18 Review git diff (additive + approved edits only).
