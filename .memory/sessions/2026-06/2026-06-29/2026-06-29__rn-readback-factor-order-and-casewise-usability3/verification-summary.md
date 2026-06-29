# RN-READBACK-FACTOR-ORDER-AND-CASEWISE-USABILITY3 Verification Summary

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5-codex
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5-codex
- verified_by_agent: codex
- verified_by_agent_model: gpt-5-codex
- attribution_basis: live

## Evidence

- Passed: `npx vitest run src/lib/calculus/workspace/integrals.test.ts src/lib/symbolic-engine/integration-risch-norman-exp-sincos-ansatz.test.ts src/lib/symbolic-engine/integration-symbolic-quadratic-rational.test.ts src/lib/symbolic-engine/integration-risch-norman-log-derivative.test.ts`.
- Passed: `npm run test:ui -- src/app/workspaces/CalculusIntegralEditorSource.ui.test.tsx`.
- Passed: `npx vitest run src/lib/symbolic-engine/integration.test.ts src/lib/calculus/engine/core.test.ts src/lib/calculus/workspace/integrals.test.ts`.
- Passed: `npm run test:ui -- src/AppMain.ui.test.tsx src/app/shell/DisplayPanel.ui.test.tsx src/app/workspaces/CalculusIntegralEditorSource.ui.test.tsx`.
- Passed: `npx tsc -b --pretty false`.
- Passed: `node tools/validate-file-sizes.mjs`.
- Passed: `npm run test:memory-protocol`.
- Passed: `git diff --check`.

## Manual Cases Covered

- `k*(2a*x+b)/(a*x^2+b*x+c)` now reaches the existing RN log-derivative route and returns `k\cdot\ln|a x^2+b x+c|`.
- `x^2e^(a*x+b)sin(c*x+d)` generated readback avoids mixed-looking `x^2 \frac{...}` and cleans nested negative fraction signs.
- Symbolic quadratic casewise answers keep the same mathematical output with roomier answer-row spacing.
