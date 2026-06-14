# CALCULUS-ENGINE-GROUPING1 Completion Report

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5
- contributors:
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5
- attribution_basis: live

## Task Goal

Group shared Calculus compute helper files under `src/lib/calculus/engine/` without changing solver behavior or the public Calculus root surfaces.

## What Changed

- Created `src/lib/calculus/engine/`.
- Moved `calculus-eval.ts` to `engine/eval.ts`.
- Moved `adaptive-simpson.ts`, `antiderivative-rules.ts`, `finite-limit-target.ts`, and `limit-heuristics.ts` into `engine/`.
- Moved `calculus-verification.ts` to `engine/verification.ts`.
- Moved focused helper tests beside the grouped helpers.
- Updated direct imports in Symbolic Engine integration, Engine math execution, Calculate mode, Algebra simplify/capability readiness, Calculus workbench, `calculus-core.ts`, and the guided Calculus workspace.
- Updated `docs/architecture/calculus-root-surface-audit.md` with the final grouping record.

## Boundaries

- Did not split `calculus-core.ts`.
- Did not move or reorganize `src/lib/calculus/workspace/`.
- Kept `calculus-identity.ts`, `calculus-workbench.ts`, and `calculus-strategy.ts` at the Calculus root.
- Did not change schemas, History/Guide compatibility, worker/OOE host ids, solver outputs, exact LaTeX, warning wording, provenance labels, or strategy metadata.

## Verification

- Verification commands are recorded in `verification-summary.md`.

## Commits

- Same-commit milestone: CALCULUS-ENGINE-GROUPING1.

## Follow-Ups

- Split `calculus-core.ts` into focused `engine/shared.ts`, `engine/integration.ts`, and `engine/limits.ts` modules in `CALCULUS-CORE-SPLIT1`.
