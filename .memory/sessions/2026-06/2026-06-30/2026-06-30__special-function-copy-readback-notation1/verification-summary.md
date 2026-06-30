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

- gate_type: ui
- milestone: `SPECIAL-FUNCTION-COPY-READBACK-NOTATION1`

## Verification

- `npx vitest run src/lib/symbolic-engine/integration-transcendental-special-functions.test.ts src/lib/symbolic-engine/integration.test.ts src/lib/calculus/engine/core.test.ts src/lib/calculus/workspace/integrals.test.ts` passed.
- `npm run test:ui -- src/app/workspaces/CalculusIntegralEditorSource.ui.test.tsx src/AppMain.ui.test.tsx src/app/shell/DisplayPanel.ui.test.tsx` passed for Display/AppMain/readback coverage; the focused Calculus file was rerun after restoring the new guardrail below.
- `npm run test:ui -- src/app/workspaces/CalculusIntegralEditorSource.ui.test.tsx` passed.
- `node tools/validate-file-sizes.mjs` passed.
- `npm run test:memory-protocol` passed.
- `git diff --check` passed.

## Blocked Gate

- `npx tsc -b --pretty false` is blocked by unrelated in-flight Calculus implicit-derivative work outside this milestone:
  - `src/app/runtime/useCalculusRuntime.ui.test.tsx` references `implicitDerivative` before the shared `CalculusScreen`/runtime types expose it.
  - `src/lib/calculus/workspace/navigation.test.ts` references `implicitDerivative` before the navigation/type layer is complete.
  - `src/lib/calculus/workspace/implicit-derivative.test.ts` cannot resolve the still-untracked `implicit-derivative` implementation file in the active other lane.

## Notes

- Added regression coverage proving generated integral Copy Expr, Copy Result, plain-text notation copy, LaTeX/casewise copy, and History replay preserve `erf`/`erfi` special-function output without degrading to ASCII or raw approximation.
- Runtime copy behavior already honored rendered/LaTeX versus plain-text notation, so no production copy-path code change was needed.
