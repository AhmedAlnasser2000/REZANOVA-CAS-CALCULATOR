## Attribution
- primary_agent: codex
- primary_agent_model: gpt-5-codex
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5-codex
- verified_by_agent: codex
- verified_by_agent_model: gpt-5-codex
- attribution_basis: live

## Gate
- date: 2026-07-03
- milestone: `CALCULUS-LIMITS-METHOD-CARD-SANITY1`
- gate_type: backend

## Verification
- PASS: `npm run test:unit -- src/lib/symbolic-engine/limits/infinity-scale-terms.test.ts src/lib/symbolic-engine/limits/mrv-lite.test.ts`
- PASS: `npm run test:unit -- src/lib/calculus/workspace/limits.test.ts src/lib/calculus/limit-route-corpus.test.ts`
- PASS: `npm run test:file-sizes`
- PASS: `npm run test:memory-protocol`
- PASS: `git diff --check`
- BLOCKED (unrelated): `npx tsc -b --pretty false`

## Blocked TypeScript Evidence
- `src/app/runtime/historyDisplayEntry.test.ts(19,9)`: readonly `lineKinds` test data is incompatible with mutable `DisplayDetailSection.lineKinds`.
- `src/lib/modes/equation/equation-corpus-algtrig-fixes.test.ts(20,79)`: existing Equation test accesses `error` on a union branch where it is not present.
- `src/lib/modes/equation/symbolic-parameterized-exact.ts(110,25)` and following: existing parameterized exact branch typing currently collapses to `never`/implicit `any`.

## Notes
- Covered `log(x)/x -> 0`, `x^5/e^x -> 0`, and `(e^x+x^3)/(e^x-1) -> 1`.
- Covered MRV-lite examples `e^{sqrt(x)}/e^x -> 0`, `e^{sqrt(x)}/x^5 -> infinity`, and `e^{x+log(x)}/(x e^x) -> 1`.
- The method-card sanity assertions inspect structured `lineParts`, because that is the rendered evidence path.
