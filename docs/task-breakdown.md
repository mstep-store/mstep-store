# Task Breakdown — Introduce SDD (Baseline)

Phased tasks to introduce Spec-Driven Development documentation.
All tasks are additive; no existing files modified.

## Phase 0 — Preparation
- T0.1 Verify git working tree clean.
- T0.2 Create branch `docs/sdd-introduction`.
- T0.3 Confirm no secrets will be referenced.

## Phase 1 — Constitution & Workflow
- T1.1 Create `docs/constitution.md`.
- T1.2 Create `docs/development-workflow.md`.
- Acceptance: principles and process documented.

## Phase 2 — System & Architecture
- T2.1 Create `docs/current-system.md`.
- T2.2 Create `docs/technical-architecture.md`.
- Acceptance: accurate inventory; no secrets.

## Phase 3 — Requirements & Testing
- T3.1 Create `docs/functional-requirements.md`.
- T3.2 Create `docs/testing-strategy.md`.
- Acceptance: FRs traceable to routes/pages.

## Phase 4 — Baseline Spec & Templates
- T4.1 Create `specs/000-baseline/spec.md`.
- T4.2 Create `specs/000-baseline/plan.md`.
- T4.3 Create `specs/000-baseline/tasks.md`.
- T4.4 Create `specs/templates/{spec,plan,tasks}-template.md`.
- Acceptance: templates usable for next feature.

## Phase 5 — Validation
- T5.1 Run `npm run lint`.
- T5.2 Run `npm run build`.
- T5.3 Review git diff: only new files; no existing files modified.
- Acceptance: build green; clean diff.

## Phase 6 — Commit & PR (optional, requires explicit user approval)
- T6.1 Commit documentation additions (only if user approves).
- T6.2 Open PR for review (only if user approves).
- T6.3 After approval, merge to `main`.

## Definition of Done
- All listed files exist.
- Lint and build pass.
- Git diff contains only new files.
- No secrets exposed.
