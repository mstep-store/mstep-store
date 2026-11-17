# Development Workflow — Kids & Co. E-commerce (SDD)

This document defines the Spec-Driven Development process for this repository.

## Overview
Every change follows: **Spec → Clarify → Plan → Tasks → Implement → Validate → Review → Merge.**

## Step 1 — Spec (`specs/NNN-feature/spec.md`)
- Define the problem, scope, out-of-scope, user stories, and acceptance criteria.
- Reference existing routes/components/services by real path.
- No implementation details yet.

## Step 2 — Clarify
- Identify ambiguities, missing requirements, and edge cases.
- Ask the user; do not assume. Wait for answers before planning.

## Step 3 — Plan (`specs/NNN-feature/plan.md`)
- Architecture and design decisions.
- Exact list of files to create and modify (additive preferred).
- Data model / Supabase changes (if any) described by table/column name only.
- Risks and rollback.

## Step 4 — Tasks (`specs/NNN-feature/tasks.md`)
- Ordered, atomic, testable tasks.
- Each task has acceptance criteria and a validation step.

## Step 5 — Implement
- Work on a feature branch: `feat/NNN-short-name`.
- Follow the constitution (additive-only, no renames, no new deps without approval).
- Keep changes small and focused.

## Step 6 — Validate
- Run `npm run lint`.
- Run `npm run build`.
- Execute manual QA checklist from the spec.
- Confirm git diff contains only intended changes.

## Step 7 — Review & Merge
- Open a PR; summarize spec/plan/tasks.
- Obtain user approval.
- Merge to `main`; update docs if behavior changed.

## Branching & Commits
- Branch: `feat/NNN-short-name`, `fix/NNN-short-name`, `docs/NNN-short-name`.
- Commits: imperative mood, reference spec number (e.g., `feat(001): add product search`).
- Never commit `.env` or secrets.

## Guardrails for AI Agents
- Present plan and wait for approval before creating/editing files.
- Do not read/print/expose `.env`.
- Do not install dependencies or modify `package.json` without approval.
- Do not rename existing files/folders.
