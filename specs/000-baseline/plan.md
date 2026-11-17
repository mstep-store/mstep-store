# Plan: 000-baseline

## Approach
Add SDD documentation only. No source code, config, or dependency changes.

## Files to Create
- `docs/constitution.md`
- `docs/current-system.md`
- `docs/functional-requirements.md`
- `docs/technical-architecture.md`
- `docs/development-workflow.md`
- `docs/testing-strategy.md`
- `docs/task-breakdown.md`
- `specs/000-baseline/spec.md`
- `specs/000-baseline/plan.md`
- `specs/000-baseline/tasks.md`
- `specs/templates/spec-template.md`
- `specs/templates/plan-template.md`
- `specs/templates/tasks-template.md`

## Files to Modify
None.

## Risks
- Documentation drift over time; mitigated by constitution + workflow.
- No automated tests; mitigated by lint/build/manual QA.

## Rollback
Delete the new `docs/` and `specs/` directories.
