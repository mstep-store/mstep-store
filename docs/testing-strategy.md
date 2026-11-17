# Testing Strategy — Kids & Co. E-commerce

## Current State
- No test runner or test files exist.
- Automated gates: `npm run lint` and `npm run build`.
- QA is manual.

## Baseline Gates (required for every change)
1. `npm run lint` passes with no errors.
2. `npm run build` succeeds.
3. Manual QA checklist from the spec's acceptance criteria.

## Manual QA Checklist (baseline flows)
- Home, products, and product detail pages render.
- Cart add/update/remove works.
- Checkout creates an order; success page shows.
- Order tracking works.
- Contact form submits.
- Admin login works; protected routes redirect when unauthenticated.
- Admin CRUD for categories/variants/orders/messages works (verify against services).
- Admin product create/update works; product deletion is not implemented (only image deletion).
- Responsive layout on mobile widths.

## Future Automated Testing (requires approval)
Adding a test runner requires explicit user approval and `package.json` changes.
Candidate stack (for future spec):
- Vitest + React Testing Library + jsdom for unit/component tests.
- Playwright for end-to-end flows (checkout, admin).
- Placement: `src/__tests__/` or co-located `*.test.jsx` (additive, no renames).

## Test Conventions (if adopted)
- Mock the Supabase client; never use real `.env` values in tests.
- Test files must not expose secrets.
- Minimum coverage targets defined per feature spec.

## Secret-Safe Testing
- Use fake env values in test setup.
- Never commit `.env`.
- Do not print credentials in test output.
