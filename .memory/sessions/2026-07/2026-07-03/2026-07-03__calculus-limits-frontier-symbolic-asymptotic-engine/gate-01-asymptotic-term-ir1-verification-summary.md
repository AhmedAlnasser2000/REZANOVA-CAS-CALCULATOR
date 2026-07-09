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

- milestone: `CALCULUS-LIMITS-ASYMPTOTIC-TERM-IR1`
- gate_type: backend
- status: pass

## Evidence

- `npm run test:unit -- src/lib/symbolic-engine/limits/asymptotic-terms.test.ts src/lib/symbolic-engine/limits.test.ts src/lib/calculus/workspace/limits.test.ts src/lib/calculus/limit-route-orchestrator.test.ts src/lib/calculus/limit-route-classifier.test.ts`
  - 5 test files passed, 41 tests passed.
- `npm run test:file-sizes`
  - Passed.
- `git diff --check`
  - Passed.
- `npx tsc -b --pretty false`
  - Blocked by pre-existing unrelated linear-algebra work in untracked `src/lib/linear-algebra/matrix-qr.ts` unused symbols.

## Notes

- This gate is behavior-invisible by design; live Limit evaluation keeps using existing classifier/orchestrator routes.
- The new IR is the shared prerequisite for conditional cases, recursive leading terms, infinity scales, rewrite cancellation, Piecewise, absolute-value side behavior, MRV-lite, and later orchestration hardening.
