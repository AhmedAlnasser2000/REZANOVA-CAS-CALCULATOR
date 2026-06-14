# CALCULUS-CORE-SPLIT1 Completion Report

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

Split the remaining root `calculus-core.ts` implementation into focused Calculus engine modules while preserving behavior and keeping `workspace/` untouched.

## What Changed

- Added `src/lib/calculus/engine/shared.ts` for shared Compute Engine boxing, numeric conversion, evaluation result types, body evaluation, limit value formatting, and detail/assumption helpers.
- Added `src/lib/calculus/engine/integration.ts` for indefinite integral resolution, exact definite integration, numeric definite integration fallback, interval safety details, antiderivative trust readback, and partial-fraction detail assembly.
- Added `src/lib/calculus/engine/limits.ts` for finite and infinite limit evaluation, finite numeric sampling, finite-limit warnings, infinity heuristic handoff, and fallback detail assembly.
- Moved `src/lib/calculus/calculus-core.test.ts` to `src/lib/calculus/engine/core.test.ts`.
- Updated direct consumers in `engine/eval.ts`, guided Calculus workspace integrals/limits, and Algebra capability readiness.
- Removed `src/lib/calculus/calculus-core.ts`.
- Removed the stale `src/lib/calculus/calculus-core.ts` file-size baseline cap.
- Updated `docs/architecture/calculus-root-surface-audit.md` with the final core split record.

## Boundaries

- Did not edit `src/lib/calculus/workspace/` beyond import updates.
- Kept `calculus-identity.ts`, `calculus-workbench.ts`, and `calculus-strategy.ts` at the Calculus root.
- Did not change schemas, History/Guide compatibility, worker/OOE host ids, solver outputs, exact LaTeX, warning wording, provenance labels, strategy metadata, or Display behavior.

## Verification

- Verification commands are recorded in `verification-summary.md`.

## Commits

- Same-commit milestone: CALCULUS-CORE-SPLIT1.

## Follow-Ups

- None required for the requested Calculus engine cleanup. Any future work should be product-facing behavior or a separately planned audit, not another root-core cleanup.
