# Verification Summary

## Attribution
- primary_agent: codex
- primary_agent_model: gpt-5.4
- contributors:
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.4
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.4
- attribution_basis: live
- commit_hash:

## Scope
- shared mixed-carrier factor recognizer
- Calculate factor routing
- narrow Equation incidental reuse
- supplement/trust preservation on the existing `POLY-RAD4` path

## Commands
- `npx vitest run src/lib/symbolic-engine/factoring.test.ts src/lib/symbolic-engine/orchestrator.test.ts src/lib/math-engine.test.ts src/lib/equation/shared-solve.test.ts src/lib/modes/equation.test.ts`
- `npm run test:unit`
- `npm run lint`

## Manual Checks
- Confirmed `x+2\sqrt{x}+1` factors to `(\sqrt{x}+1)^2` through `Calculate > Factor`.
- Confirmed `x-5\sqrt{x}+6` factors to `(\sqrt{x}-2)(\sqrt{x}-3)` through `Calculate > Factor` while preserving `x \ge 0`.
- Confirmed `x^{2/3}-5x^{1/3}+6` factors through the same shared carrier path and renders in root notation as `(\sqrt[3]{x}-2)(\sqrt[3]{x}-3)`.
- Confirmed unrelated radical families such as `\sqrt{x}+\sqrt{x+1}` stay unchanged.
- Confirmed Equation can reuse mixed-carrier factorization incidentally when it improves an existing bounded sink, while still stopping honestly when no bounded sink is improved.

## Outcome
- Passed.

## Outstanding Gaps
- No full `npm run test:gate` was run in this pass because the code change was backend-only and the repo already has separate unrelated uncommitted UI/loading-fix work in the tree.
