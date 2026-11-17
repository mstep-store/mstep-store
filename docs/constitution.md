# Project Constitution — Kids & Co. E-commerce

This document defines the non-negotiable principles governing all work on this repository.
It applies to human contributors and AI agents alike.

## 1. Stack Lock
- Frontend: React 19, react-dom 19.
- Build tooling: Vite 8 with `@vitejs/plugin-react` and `@tailwindcss/vite`.
- Styling: Tailwind CSS 4 plus the existing CSS variables in `src/index.css`.
- Routing: React Router 8 (`react-router`).
- Backend/data: Supabase JS 2 (`@supabase/supabase-js`).
- Icons: lucide-react.
- Language: JavaScript (ESM, `"type": "module"`). TypeScript is NOT in use.
- No new runtime or dev dependencies may be added without an approved spec and explicit user approval.

## 2. Additive-Only Policy
- Do not modify, delete, or rename any existing file under `src/`, root configs (`vite.config.js`, `eslint.config.js`, `vercel.json`, `index.html`), `package.json`, or `package-lock.json` unless a spec explicitly requires it AND the user approves.
- Do not rename folders or files, including the existing `src/contexe` directory (typo retained to preserve imports).
- New functionality must be added via new files and additive edits only where strictly necessary.

## 3. Preserve Existing Behavior
- All existing routes, features, database integrations, and business logic must continue to work after any change.
- Admin area (`/admin/*`) protection via `ProtectedRoute` must remain intact.
- Supabase client initialization and service-layer patterns must remain unchanged unless approved.

## 4. Spec-First Workflow
- Every change begins as a specification in `specs/NNN-feature/spec.md`.
- No implementation work may start without an approved spec and plan.
- Ambiguities must be clarified before planning.
- Plans must list every file to be created or modified.

## 5. Secret Hygiene
- `.env` and any `*.env.*` files are never read, printed, committed, or embedded in documentation.
- Environment variables are referenced by name only: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
- Never expose a Supabase service-role or secret key in client code or docs.
- If a secret is suspected to be exposed, stop and notify the user immediately.

## 6. Quality Gates
- `npm run lint` must pass with no errors before any change is considered complete.
- `npm run build` must succeed before merge.
- No new `console.log`/debug leftovers in committed code; existing `console.error` logging is acceptable (follow existing lint rules).

## 7. Testing Gate
- Until a test runner is explicitly approved and installed, the minimum gate is lint + build + a manual QA checklist derived from the spec's acceptance criteria.
- Automated tests are added only after the test tooling is approved via a spec (see `docs/testing-strategy.md`).

## 8. Review & Approval
- AI agents must present a plan and wait for explicit user approval before creating or editing files.
- Destructive or broad changes require a separate, clearly labeled approval.

## 9. Documentation Discipline
- SDD artifacts live under `docs/` and `specs/`.
- Documentation must be updated when behavior changes.
- Specs must remain traceable to code (reference real paths, components, services).
