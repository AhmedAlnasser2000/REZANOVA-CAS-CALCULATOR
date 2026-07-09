# EQUATION-COMPLEX-DISTRICT-SPLIT1 Completion Report

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

Split the monolithic Complex Equation implementation into a private district while keeping `solveBoundedComplexEquation` as the public facade export.

## Recovery Note

This memory dossier was added after the implementation commit because the normal memory closeout step was missed when `e368938` was created. The recovery was recorded by amending the metadata-only memory commit, not by rewriting the original implementation commit.

## What Changed

- Kept `src/lib/equation/equation-complex.ts` as the public facade.
- Added private `src/lib/equation/complex/` modules:
  - `branches.ts`
  - `exact.ts`
  - `latex.ts`
  - `linear-rational.ts`
  - `math-json.ts`
  - `polynomial.ts`
  - `preimage.ts`
  - `solve.ts`
  - `types.ts`
- Preserved the existing route order: direct complex linear, selected-target power, guarded preimage, rational, factorable polynomial, negative-discriminant quadratic, unsupported exact-family error.
- Updated `tools/file-size-baseline.json` after removing the over-cap `equation-complex.ts` entry.

## Boundaries

- No new Complex solver families.
- No Approximate or Isolate complex solving.
- No `i` override syntax.
- No OOE, runtime-host, replay/history/schema, worker-host, or display-policy changes.
- Complex product surface remains Complex On + Exact only.

## Verification

- `npx tsc -b --pretty false` passed.
- `npm run test:unit -- src/lib/equation/equation-complex.test.ts src/lib/equation/complex-input-policy.test.ts src/lib/equation/equation-target.test.ts` passed.
- `npm run test:unit -- src/lib/modes/equation.test.ts src/lib/equation/equation-direct-symbolic-worker.test.ts` passed.
- `npm run test:file-sizes` passed.
- `git diff --check` passed.

## Size Ratchet

- Removed the over-cap `src/lib/equation/equation-complex.ts` file-size baseline entry after the split.

## Commits

- `e368938` EQUATION-COMPLEX-DISTRICT-SPLIT1.

## Follow-Ups

- Keep Complex Exact stability work as a separate coverage/fix milestone.
