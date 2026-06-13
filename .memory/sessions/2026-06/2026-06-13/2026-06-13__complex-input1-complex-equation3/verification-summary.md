# COMPLEX-INPUT1 + COMPLEX-EQUATION3 Verification Summary

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5
- contributors:
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5
- attribution_basis: live
- commit_hash: `17b8669`

## Scope

`COMPLEX-INPUT1 + COMPLEX-EQUATION3` hardens existing Complex input policy and Complex On + Exact routing without broadening the solver family surface.

## Commands

- `npx tsc -b --pretty false`
- `npm run test:unit -- src/lib/input/input-canonicalization.test.ts src/lib/equation/equation-target.test.ts src/lib/equation/equation-complex.test.ts`
- `npm run test:unit -- src/app/logic/runtimeControllers.test.ts`
- `npm run lint`
- `npm run build`
- `npm run test:file-sizes`
- `npm run test:memory-protocol`
- `git diff --check`

## Manual Checks

- Confirmed `i` / `\imaginaryI` remained reserved for Equation complex handling.
- Confirmed `j` and `k` remained ordinary variables.
- Confirmed Approximate and Isolate complex solving stayed out of scope.

## Outcome

All planned Complex input and Complex Equation hardening checks passed before `17b8669`. This record was added later because the memory closeout step was missed.

## Outstanding Gaps

No known `COMPLEX-INPUT1 + COMPLEX-EQUATION3` gaps.
