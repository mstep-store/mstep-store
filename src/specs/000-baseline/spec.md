# Spec: 000-baseline — Current System Baseline

## Summary
Capture the existing Kids & Co. e-commerce application as the baseline specification.
This spec documents what exists today so future changes are measured against it.

## Scope
In scope:
- Document current routes, features, and integrations.
- Establish SDD documentation structure.

Out of scope:
- Any code changes.
- New features.
- Dependency changes.

## User Journeys
1. Customer browses products, views details, adds to cart, checks out (COD), receives confirmation, tracks order.
2. Customer submits a contact message.
3. Admin logs in and manages products, variants, categories, orders, messages, and views dashboard.

## Acceptance Criteria
- AC-1: All existing routes remain functional.
- AC-2: `npm run lint` passes.
- AC-3: `npm run build` succeeds.
- AC-4: No existing files modified; only new docs/specs added.
- AC-5: No secrets exposed in any new file.

## Verification
- Routes, services, and entities listed are verified against source where noted.
- Dashboard metrics, admin CRUD completeness, order cancellation, and deployment runtime require further verification (see `docs/current-system.md` and `docs/functional-requirements.md`).

## Traceability
- Routes: `src/App.jsx`.
- Services: `src/services/*`.
- Pages: `src/pages/store/*`, `src/pages/admin/*`.
- See `docs/current-system.md`.
