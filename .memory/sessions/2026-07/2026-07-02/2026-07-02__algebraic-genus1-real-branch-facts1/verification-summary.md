# ALGEBRAIC-GENUS1-REAL-BRANCH-FACTS1 Verification Summary

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
- type: behavior-invisible exact-rational genus-1 real-root branch evidence

## Verification

- `npx vitest run src/lib/symbolic-engine/integration-algebraic-genus1-curve-profile.test.ts src/lib/symbolic-engine/integration-algebraic-genus1-degeneration-facts.test.ts src/lib/symbolic-engine/integration-algebraic-genus1-real-branch-facts.test.ts` passed: 3 files, 18 tests.
- `npx vitest run src/lib/symbolic-engine/integration-algebraic-genus1-curve-profile.test.ts src/lib/symbolic-engine/integration-algebraic-genus1-degeneration-facts.test.ts src/lib/symbolic-engine/integration-algebraic-genus1-real-branch-facts.test.ts src/lib/symbolic-engine/integration-algebraic-genus0-genus1-boundary.test.ts src/lib/symbolic-engine/integration.test.ts src/lib/calculus/engine/core.test.ts src/lib/calculus/workspace/integrals.test.ts` passed: 7 files, 117 tests.
- `npm run test:file-sizes` passed.
- `git diff --check` passed.

## Evidence Notes

- Focused tests prove Sturm-certified branch rows for exact-rational cubic radicals, reciprocal-radical endpoint exclusions for exact quartic branches, irreducible cubic real-domain rows, repeated-root stops, symbolic branch deferral, and unchanged live integration behavior for genus-1 radicals.
- Sturm certification remains the root-count/order authority. Numeric roots from the existing polynomial root helper are used only as companion sample points after Sturm certification, so this milestone does not adopt numeric-confidence branch proof.

## Blocked Gate Evidence

- `npx tsc -b --pretty false` remains blocked by unrelated active-lane errors in `src/app/runtime/editorTargets.ts`:
  - `TS2769` at line 66: string passed where a `Selector` is expected.
  - `TS2339` at lines 84-86: `getValue`, `setValue`, and `dispatchEvent` on `never`.
