## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live

## Verification Summary

- Gate: ui.
- Focused Vitest passed:
  - `npx vitest run src/lib/equation/complex/meromorphic-policy.test.ts src/lib/equation/complex/branch-cut-policy.test.ts src/lib/equation/complex/contour-winding.test.ts src/lib/equation/complex/numeric-evaluator.test.ts src/lib/modes/equation/complex-region-nonlinear-solve.test.ts src/lib/modes/equation/complex-benchmark-region-runner.test.ts`
- Equation corpus ledger passed:
  - `node tools/validate-equation-corpus-ledger.mjs`
  - `node --test tools/validate-equation-corpus-ledger.test.mjs`
- Whitespace and file-size gates passed:
  - `git diff --check`
  - `npm run test:file-sizes`
- TypeScript gate attempted:
  - `npx tsc -b --pretty false`
  - Blocked by unrelated dirty Calculus lane: `src/lib/calculus/engine/limits.ts(43,3): error TS6133: 'withLimitDetailLineParts' is declared but its value is never read.`
- Playwright visual verification passed after sandbox escalation:
  - `npx playwright test .task_tmp/complex-equation-branch-pole6/branch-pole-visual.spec.ts --config .task_tmp/complex-equation-branch-pole6/playwright.visual.config.ts`
- Visual evidence:
  - `.task_tmp/complex-equation-branch-pole6/screenshots/pole-policy-no-root.png`
  - `.task_tmp/complex-equation-branch-pole6/screenshots/branch-cut-subdivision-stop.png`
- Screenshot inspection: pole policy and branch-cut subdivision cards were readable, showed the expected evidence, and had no obvious text overlap or overflow.

## Evidence Notes

- `e^x+x^{-1}=0` visually verifies controlled no-root Complex Region evidence with one known interior pole and `zeros minus known poles = -1`.
- `ln(x)+x=0` visually verifies subdivision-enabled branch-cut unsafe-cell evidence.
- Unit coverage verifies pole-aware contour accounting for `(z-1)/z=0`, no-root `1/z=0`, direct tangent pole counts, and controlled pole diagnostics from evaluator calls.
