# ALGEBRAIC-GENUS1-GENERIC-FIRST-KIND-LIVE1 Verification Summary

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5-codex
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5-codex
- verified_by_agent: codex
- verified_by_agent_model: gpt-5-codex
- attribution_basis: live

## Gates

- label: backend
- type: live exact-rational generic genus-1 first-kind adoption

## Verification

- Passed: focused genus-1 first-kind/root/normal-form/proof tests:
  - `npx vitest run src/lib/symbolic-engine/integration-algebraic-genus1-elliptic-kinds-live.test.ts src/lib/symbolic-engine/integration-algebraic-genus1-root-legendre-data.test.ts src/lib/symbolic-engine/integration-algebraic-genus1-normal-form.test.ts src/lib/symbolic-engine/integration-algebraic-genus1-elliptic-proof-backcheck.test.ts`
  - Result: 4 files, 22 tests passed.
- Passed: `npx tsc -b --pretty false`.
- Passed: `npm run test:memory-protocol`.
- Passed: `git diff --check`.
- Blocked by unrelated dirty lanes: full core regression command
  - `npx vitest run src/lib/symbolic-engine/integration.test.ts src/lib/calculus/engine/core.test.ts src/lib/calculus/workspace/integrals.test.ts`
  - Result: 96 passed, 1 failed in `src/lib/calculus/engine/core.test.ts` because unrelated dirty Limits wording changed the expected detail text from `rational dominance` to `asymptotic comparison`.
- Blocked by unrelated dirty lanes: `npm run test:file-sizes`
  - Result: failed because unrelated dirty `src/lib/modes/equation/parameterized.ts` has 924 lines while its cap is 900; `HEAD` has 899 lines and this milestone did not edit that file.

## Evidence Notes

- Direct tests prove `1/sqrt(x^3-x)` resolves as `EllipticF` with named-root first-kind proof evidence and preferred branch `x>\alpha_{3}`.
- Direct tests prove `1/sqrt((x-1)(x-2)(x-3)(x-4))` resolves as `EllipticF` with named-root details and preferred branch `\alpha_{2}<x<\alpha_{3}`.
- Regression tests keep `sqrt(x^3-x)` deferred to the second-kind boundary.
- Changed TypeScript files in this milestone are 287, 112, and 72 lines respectively, so the file-size failure is not from this milestone.
