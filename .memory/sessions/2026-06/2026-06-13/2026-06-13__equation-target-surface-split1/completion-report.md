# EQUATION-TARGET-SURFACE-SPLIT1 Completion Report

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

Split the Equation target surface into a private district while preserving root compatibility facades and Equation mode behavior.

## What Changed

- Added `src/lib/equation/target/surface.ts` for the active target surface used by Equation mode.
- Added `src/lib/equation/target/resolution.ts` for the existing target-resolution helper surface.
- Kept `src/lib/equation/equation-target.ts` and `src/lib/equation/equation-target-resolution.ts` as root compatibility facades.
- Moved the target test under `src/lib/equation/target/` and kept it importing through the root facade.

## Boundaries

- No `domain-guards.ts` split.
- No selected-target, Complex intent, display/readback, OOE, replay/history, schema, capability, worker-host, solver-order, or reserved-symbol behavior changes.
- `i` / `\imaginaryI` remains reserved for Equation complex handling; `j` and `k` remain ordinary variables.

## Verification

- `npx tsc -b --pretty false` passed.
- `npm run test:unit -- src/lib/equation/target/*.test.ts` passed.
- `npm run test:unit -- src/lib/equation/equation-complex.test.ts src/lib/equation/equation-selected-target-isolation.test.ts` passed.
- `npm run test:unit -- src/lib/modes/equation.test.ts src/app/logic/runtimeControllers.test.ts` passed.
- `npm run test:file-sizes` passed.
- `npm run test:memory-protocol` passed.
- `git diff --check` passed.

## Size Ratchet

- No file-size baseline update was required.

## Commits

- Same-commit milestone: EQUATION-TARGET-SURFACE-SPLIT1.

## Follow-Ups

- Continue with `EQUATION-ROOT-FACADE-AUDIT0`.
