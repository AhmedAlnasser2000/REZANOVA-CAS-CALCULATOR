# PGL-VIS1 Interactive Labs Console Verification Summary

## Attribution
- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live

## Automated Checks
- Passed: `npm run test:labs-catalog`
- Passed: `npm run test:playground`
- Passed: `npm run test:unit -- src/lib/labs/runner-registry.test.ts src/lib/labs/catalog.test.ts`
- Passed: `npm run test:ui -- src/components/LabsPanel.ui.test.tsx`
- Passed: `npm run test:memory-protocol`
- Passed: `npm run lint`
- Passed: `npm run build`

## Dev Bridge Smoke
- Passed: `VITE_SHOW_LABS=1 VITE_ENABLE_LAB_RUNNERS=1 npm run dev`
- Passed: `GET /__calcwiz_labs/runners` returned runner metadata including corpus cases.
- Passed: `POST /__calcwiz_labs/run` for `expression-baseline-probe` returned `\frac{1}{2}` for `\frac{1}{3}+\frac{1}{6}`.
- Passed: `POST /__calcwiz_labs/run` for `sym-search-planner-ordering` returned planner comparison rows for a custom equation.

## Notes
- Build still emits the pre-existing large chunk warning.
- Dev server was stopped after the smoke check.
- `test-results/` remains generated/untracked noise.
