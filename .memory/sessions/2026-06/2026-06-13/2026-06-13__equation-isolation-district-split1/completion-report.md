# EQUATION-ISOLATION-DISTRICT-SPLIT1 Completion Report

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

Split the Equation isolation implementation into a private district while keeping the existing root public facades stable.

## What Changed

- Kept `src/lib/equation/equation-algebraic-isolation.ts` as the public facade for `solveEquationAlgebraicIsolation` and its exported types.
- Kept `src/lib/equation/equation-selected-target-isolation.ts` as the public facade for `solveSelectedTargetIsolationEquation`, `isolateSelectedTargetEquation`, and their exported types.
- Added private `src/lib/equation/isolation/` modules:
  - `math-json.ts`
  - `target-context.ts`
  - `peeling.ts`
  - `algebraic-power.ts`
  - `algebraic.ts`
  - `selected-target.ts`
- Moved shared MathJSON helpers, equation-side parsing helpers, shell-peeling mechanics, algebraic power solving, algebraic isolation, and selected-target isolation behind that private district boundary.
- Updated `tools/file-size-baseline.json` after removing the stale over-cap `equation-algebraic-isolation.ts` entry.

## Boundaries

- No solver-order changes.
- No display or readback wording changes.
- No OOE, replay/history, schema, capability, worker-host, or reserved-symbol changes.
- No Complex readback cleanup, new solver family, guarded solver split, or parameterized solver split.
- First-party callers continue importing from the root facade files.

## Verification

- `npx tsc -b --pretty false` passed.
- `npm run test:unit -- src/lib/equation/equation-algebraic-isolation.test.ts src/lib/equation/equation-selected-target-isolation.test.ts` passed.
- `npm run test:unit -- src/lib/equation/equation-complex.test.ts src/lib/equation/parameterized/composition.test.ts` passed.
- `npm run test:unit -- src/lib/equation/guarded-solve.test.ts src/lib/equation/shared-solve.test.ts src/lib/equation/solver-parity.contract.test.ts src/lib/modes/equation.test.ts` passed.
- `npm run lint` passed.
- `npm run build` passed.
- `npm run test:file-sizes` passed.
- `npm run test:memory-protocol` passed.
- `git diff --check` passed.

## Size Ratchet

- Removed the stale over-cap `src/lib/equation/equation-algebraic-isolation.ts` baseline entry.
- Largest new isolation module stayed below the 900-line ratchet.

## Commits

- Same-commit milestone: EQUATION-ISOLATION-DISTRICT-SPLIT1.

## Follow-Ups

- Keep guarded solver and parameterized solver splits deferred.
