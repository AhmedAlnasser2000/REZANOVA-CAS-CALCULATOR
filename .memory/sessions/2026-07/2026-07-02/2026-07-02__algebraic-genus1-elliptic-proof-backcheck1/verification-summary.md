# ALGEBRAIC-GENUS1-ELLIPTIC-PROOF-BACKCHECK1 Verification Summary

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
- type: behavior-invisible genus-1 elliptic proof backcheck evidence

## Verification

- `npx vitest run src/lib/symbolic-engine/integration-algebraic-genus1-elliptic-proof-backcheck.test.ts` passed: 1 file, 6 tests.
- `npx vitest run src/lib/symbolic-engine/integration-algebraic-genus1-curve-profile.test.ts src/lib/symbolic-engine/integration-algebraic-genus1-degeneration-facts.test.ts src/lib/symbolic-engine/integration-algebraic-genus1-real-branch-facts.test.ts src/lib/symbolic-engine/integration-algebraic-genus1-named-root-readback.test.ts src/lib/symbolic-engine/integration-algebraic-genus1-normal-form.test.ts src/lib/symbolic-engine/integration-algebraic-genus1-differential-basis.test.ts src/lib/symbolic-engine/integration-algebraic-genus1-elliptic-proof-backcheck.test.ts src/lib/symbolic-engine/integration-algebraic-genus0-genus1-boundary.test.ts src/lib/symbolic-engine/integration.test.ts src/lib/calculus/engine/core.test.ts src/lib/calculus/workspace/integrals.test.ts` passed: 11 files, 140 tests.
- `npm run test:file-sizes` passed.
- `npm run test:memory-protocol` passed.
- `git diff --check` passed.

## Evidence Notes

- Canonical Legendre first-, second-, and third-kind templates now carry proof-local backcheck evidence.
- Proof differentiation uses internal elliptic derivative rules with Compute Engine fallback denied.
- Generic exact curves remain root-based readiness; symbolic generic curves remain symbolic readiness.
- Live integration dispatch is unchanged.

## Blocked Gate Evidence

- `npx tsc -b --pretty false` remains blocked only by unrelated active-lane errors in `src/app/runtime/editorTargets.ts`:
  - `TS2769` at line 66: string passed where a `Selector` is expected.
  - `TS2339` at lines 84-86: `getValue`, `setValue`, and `dispatchEvent` on `never`.
