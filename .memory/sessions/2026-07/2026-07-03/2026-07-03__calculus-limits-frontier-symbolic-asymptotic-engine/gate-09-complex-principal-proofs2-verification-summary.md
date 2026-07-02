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
- milestone: `CALCULUS-LIMITS-COMPLEX-PRINCIPAL-PROOFS2`
- gate_type: backend

## Verification
- PASS: `npm run test:unit -- src/lib/symbolic-engine/limits/complex-domain.test.ts src/lib/calculus/workspace/limits.test.ts src/lib/calculus/engine/core.test.ts`
- PASS: `npm run test:unit -- src/lib/calculus/limit-route-classifier.test.ts src/lib/calculus/workspace/limits.test.ts src/lib/calculus/engine/limit-heuristics.test.ts src/lib/calculus/engine/finite-limit-target.test.ts src/lib/calculus/limit-route-orchestrator.test.ts src/lib/calculus/limit-request.test.ts src/lib/symbolic-engine/limits.test.ts src/lib/symbolic-engine/limits/infinity-scale-terms.test.ts src/lib/symbolic-engine/limits/mrv-lite.test.ts src/lib/symbolic-engine/limits/piecewise-limits.test.ts src/lib/symbolic-engine/limits/conditional-cases.test.ts src/lib/symbolic-engine/limits/asymptotic-terms.test.ts src/lib/symbolic-engine/limits/finite-leading-terms.test.ts src/lib/symbolic-engine/limits/abs-side-behavior.test.ts src/lib/symbolic-engine/limits/complex-domain.test.ts src/lib/symbolic-engine/limits/lhospital.test.ts`
- BLOCKED: `npx tsc -b --pretty false` by unrelated active integration edits in `src/lib/symbolic-engine/integration-algebraic-genus1-real-branch-facts.test.ts`, where another lane references `exactSupplements` instead of `exactSupplementLatex`.
- PASS: `npm run test:file-sizes`
- PASS: `git diff --check`

## Notes
- Covered Complex On `lim x -> 0 sqrt(x) -> 0`.
- Covered Complex On `lim x -> -1 sqrt(x+1) -> 0`.
- Preserved Real mode domain failure for `sqrt(x^2+x)-x` at `0`.
- Preserved controlled unsupported complex proof behavior for `x/sqrt(x)` at `0`.
- `npm run test:memory-protocol` is expected after durable-memory updates and before commit.
