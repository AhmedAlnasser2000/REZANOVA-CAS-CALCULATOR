# ALGEBRAIC-GENUS1-DIFFERENTIAL-BASIS-REDUCTION1 Verification Summary

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
- type: behavior-invisible genus-1 differential-basis obligations

## Verification

- `npx vitest run src/lib/symbolic-engine/integration-algebraic-genus1-differential-basis.test.ts` passed: 1 file, 6 tests.
- `npx vitest run src/lib/symbolic-engine/integration-algebraic-genus1-curve-profile.test.ts src/lib/symbolic-engine/integration-algebraic-genus1-degeneration-facts.test.ts src/lib/symbolic-engine/integration-algebraic-genus1-real-branch-facts.test.ts src/lib/symbolic-engine/integration-algebraic-genus1-named-root-readback.test.ts src/lib/symbolic-engine/integration-algebraic-genus1-normal-form.test.ts src/lib/symbolic-engine/integration-algebraic-genus1-differential-basis.test.ts src/lib/symbolic-engine/integration-algebraic-genus0-genus1-boundary.test.ts src/lib/symbolic-engine/integration.test.ts src/lib/calculus/engine/core.test.ts src/lib/calculus/workspace/integrals.test.ts` passed: 10 files, 134 tests.
- `npm run test:file-sizes` passed.
- `git diff --check` passed.

## Evidence Notes

- Canonical Legendre first-, second-, and third-kind normal forms now produce reduced elliptic basis obligations.
- Canonical template reductions currently produce no rational or logarithmic residuals.
- Generic exact curves remain root-based readiness; symbolic generic curves remain branch/fact-capped readiness.
- Live integration dispatch is unchanged.

## Blocked Gate Evidence

- `npx tsc -b --pretty false` remains blocked only by unrelated active-lane errors in `src/app/runtime/editorTargets.ts`:
  - `TS2769` at line 66: string passed where a `Selector` is expected.
  - `TS2339` at lines 84-86: `getValue`, `setValue`, and `dispatchEvent` on `never`.
