# ALGEBRAIC-GENUS1-RATIONAL-IN-RADICAL-HERMITE1 Verification Summary

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live

## Gates

- label: backend
- type: bounded genus-1 rational-in-radical Hermite bridge

## Verification

- `npx vitest run src/lib/symbolic-engine/integration-algebraic-genus1-rational-in-radical-hermite.test.ts` passed: 1 file, 4 tests.
- `npx vitest run src/lib/symbolic-engine/integration-algebraic-genus1-curve-profile.test.ts src/lib/symbolic-engine/integration-algebraic-genus1-degeneration-facts.test.ts src/lib/symbolic-engine/integration-algebraic-genus1-real-branch-facts.test.ts src/lib/symbolic-engine/integration-algebraic-genus1-named-root-readback.test.ts src/lib/symbolic-engine/integration-algebraic-genus1-normal-form.test.ts src/lib/symbolic-engine/integration-algebraic-genus1-differential-basis.test.ts src/lib/symbolic-engine/integration-algebraic-genus1-elliptic-proof-backcheck.test.ts src/lib/symbolic-engine/integration-algebraic-genus1-elliptic-kinds-live.test.ts src/lib/symbolic-engine/integration-algebraic-genus1-rational-in-radical-hermite.test.ts src/lib/symbolic-engine/integration-algebraic-genus0-genus1-boundary.test.ts src/lib/symbolic-engine/integration.test.ts src/lib/calculus/engine/core.test.ts src/lib/calculus/workspace/integrals.test.ts` passed: 13 files, 148 tests.
- `npm run test:file-sizes` passed.
- `npm run test:memory-protocol` passed after durable-memory updates.
- `git diff --check` passed.

## Evidence Notes

- `x^2/sqrt((1-x^2)(1-m*x^2))` resolves through `u-substitution` with `EllipticF/E` basis terms and `m != 0`.
- `x^2/((1-n*x^2)sqrt((1-x^2)(1-m*x^2)))` resolves through `u-substitution` with `EllipticPi/F` basis terms and `n != 0`.
- Odd numerators and generic cubic radicals remain controlled unsupported/deferred.

## Blocked Gate Evidence

- `npx tsc -b --pretty false` remains blocked only by unrelated active-lane errors in `src/app/runtime/editorTargets.ts`:
  - `TS2769` at line 66: string passed where a `Selector` is expected.
  - `TS2339` at lines 84-86: `getValue`, `setValue`, and `dispatchEvent` on `never`.
