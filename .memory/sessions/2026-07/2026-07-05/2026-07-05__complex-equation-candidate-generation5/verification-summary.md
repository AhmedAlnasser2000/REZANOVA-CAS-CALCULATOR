## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5-codex
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5-codex
- verified_by_agent: codex
- verified_by_agent_model: gpt-5-codex
- attribution_basis: live

## Verification Summary

- Gate: ui.
- Focused Vitest passed:
  - `npx vitest run src/lib/equation/complex/numeric-evaluator.test.ts src/lib/equation/complex/seed-grid-newton.test.ts src/lib/modes/equation/complex-region-nonlinear-solve.test.ts src/lib/modes/equation/complex-benchmark-region-runner.test.ts`
- TypeScript passed:
  - `npx tsc -b --pretty false`
- Equation corpus ledger passed:
  - `node tools/validate-equation-corpus-ledger.mjs`
  - `node --test tools/validate-equation-corpus-ledger.test.mjs`
- Whitespace and file-size gates passed:
  - `git diff --check`
  - `npm run test:file-sizes`
- Playwright visual verification passed after sandbox escalation:
  - `npx playwright test .task_tmp/complex-equation-candidates5/candidate-diagnostics-visual.spec.ts --config .task_tmp/complex-equation-candidates5/playwright.visual.config.ts`
- Visual evidence:
  - `.task_tmp/complex-equation-candidates5/screenshots/candidate-diagnostics.png`
- Screenshot inspection: expanded `Complex Search Diagnostics` card was readable and showed deterministic, adaptive, low-discrepancy, random, cluster polish, analytic derivative, finite-difference derivative, and damping retry counters without obvious overlap.

## Evidence Notes

- `z^2+1=0` unit coverage verifies non-real root discovery and low-discrepancy/cluster-polish diagnostics.
- `e^z-1=0` unit coverage verifies analytic derivative use and finite-difference suppression where analytic derivatives are available.
- App visual coverage verifies the new diagnostics through the real Equation > Symbolic > Complex Region surface.
