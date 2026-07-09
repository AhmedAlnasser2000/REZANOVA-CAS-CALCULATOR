# CALCULUS-ENGINE-PATH-AUDIT0 Completion Report

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors:
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live

## Task Goal

Audit `src/lib/advanced-calc/*` versus canonical `src/lib/calculus/*` after the visible Calculus identity cleanup.

## What Changed

- Added `docs/architecture/calculus-engine-path-audit.md`.
- Updated `docs/README.md`.
- Classified `src/lib/calculus/*` as shared math core, identity, workbench, and low-level evaluation support.
- Classified `src/lib/advanced-calc/*` as the internal guided Calculus workspace district.
- Recorded current consumers across modes, workers, app runtime, Guide, virtual keyboard, variable memory, schemas, and tests.
- Recommended keeping `advanced-calc` in place for now and deferring any path migration to a dedicated move-heavy milestone.

## Boundaries

- Docs/memory only.
- No engine files, imports, worker paths, schemas, Guide launch fields, variable-memory policy, solver behavior, Display behavior, OOE policy, or CSS behavior changed.

## Verification

- Verification commands are recorded in `verification-summary.md`.

## Commits

- Same-commit milestone: CALCULUS-ENGINE-PATH-AUDIT0.

## Follow-Ups

- If tree clarity remains painful, plan a future `CALCULUS-GUIDED-WORKSPACE-DISTRICT-MOVE1` with broad tests and without persisted-field migration.
