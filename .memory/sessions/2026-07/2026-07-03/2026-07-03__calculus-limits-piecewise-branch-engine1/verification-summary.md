## Attribution
- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live

## Gate
- date: 2026-07-03
- milestone: `CALCULUS-LIMITS-PIECEWISE-BRANCH-ENGINE1`
- gate_type: backend

## Verification
- PASS: `npm run test:unit -- src/lib/symbolic-engine/limits/piecewise-limits.test.ts src/lib/calculus/workspace/limits.test.ts src/lib/calculus/limit-route-corpus.test.ts src/lib/calculus/limit-route-classifier.test.ts`
- PASS: `npm run test:file-sizes`
- PASS: `npm run test:memory-protocol`
- PASS: `git diff --check`
- BLOCKED (unrelated): `npx tsc -b --pretty false`

## Blocked TypeScript Evidence
- `src/app/runtime/historyDisplayEntry.test.ts(19,9)`: readonly `lineKinds` test data is incompatible with mutable `DisplayDetailSection.lineKinds`.
- `src/lib/modes/equation/equation-corpus-algtrig-fixes.test.ts(20,79)`: existing Equation test accesses `error` on a union branch where it is not present.
- `src/lib/modes/equation/symbolic-parameterized-exact.ts(110,25)` and following: existing parameterized exact branch typing currently collapses to `never`/implicit `any`.

## Notes
- Covered `lim x -> 2 piecewise(x^2 if x<2; 4 otherwise) -> 4`.
- Covered right/left one-sided Piecewise branch selection for `piecewise(-1 if x<0; 1 otherwise)`.
- Covered over-cap Piecewise branch stops and unsupported selected-branch diagnostics.
- Extracted `piecewise-parser.ts`; file-size gate passes with `piecewise-limits.ts` at 533 lines.
