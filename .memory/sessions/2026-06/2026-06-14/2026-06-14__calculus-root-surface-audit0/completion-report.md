# CALCULUS-ROOT-SURFACE-AUDIT0 Completion Report

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

Audit the post-merge `src/lib/calculus/` root surface before any further shared engine reorganization.

## What Changed

- Added `docs/architecture/calculus-root-surface-audit.md`.
- Updated `docs/README.md`.
- Classified stable root surfaces that should stay at root: `calculus-identity.ts`, `calculus-workbench.ts`, and `calculus-strategy.ts`.
- Classified future shared engine district candidates: `calculus-core.ts`, `calculus-eval.ts`, `adaptive-simpson.ts`, `antiderivative-rules.ts`, `calculus-verification.ts`, `finite-limit-target.ts`, and `limit-heuristics.ts`.
- Recorded live external consumers for shared helpers, including Symbolic Engine, Engine math execution, Calculate mode, Algebra simplify/capability policy, app runtime, and tests.
- Amended in the tiny drift fixes that were already verified before commit: current-state Calculus path refresh and OOE boundary allowlist/test fixture update from `table` to `table-core`.

## Boundaries

- Mostly docs/memory, plus the tiny validator/current-state drift fixes included at user request.
- Did not move Calculus files, split `calculus-core.ts`, edit `workspace/`, change imports, update file-size baselines, alter solver behavior, change Display/OOE policy, or touch schema/replay compatibility.

## Verification

- Verification commands are recorded in `verification-summary.md`.

## Commits

- Same-commit milestone: CALCULUS-ROOT-SURFACE-AUDIT0.

## Follow-Ups

- Plan `CALCULUS-ENGINE-GROUPING1` and `CALCULUS-CORE-SPLIT1` only after deciding whether shared helpers with external consumers should move through direct imports or root facades.
