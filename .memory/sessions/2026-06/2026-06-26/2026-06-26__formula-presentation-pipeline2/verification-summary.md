# FORMULA-PRESENTATION-PIPELINE2 Verification Summary

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live

## Verification

- `npm run test:unit -- src/lib/display/scheduling/result-size-policy.test.ts src/lib/display/scheduling/display-render-scheduler.test.ts src/lib/display/result/display-blocks.test.ts src/lib/equation/parameterized/cubic-cardano.test.ts src/lib/equation/parameterized/quartic-ferrari.test.ts src/lib/equation/parameterized/composition.test.ts src/lib/equation/parameterized/exp-log.test.ts`
  - Passed: 7 unit files, 145 tests.
- `npm run test:ui -- src/app/shell/DisplayPanel.ui.test.tsx`
  - Passed: 1 UI file, 7 tests.
- `npm run test:ui -- src/AppMain.ui.test.tsx`
  - Passed: 1 UI file, 122 tests.
- `npm run test:ui -- src/AppMain.formula-presentation.ui.test.tsx`
  - Passed: 1 UI file, 3 tests.
- `npm run build`
  - Passed. Vite reported the existing dynamic-import chunking warnings.
- `npm run test:file-sizes`
  - Passed: 1038 files, 9 baseline caps.
- `npm run test:memory-protocol`
  - Passed after durable memory edits.
- `git diff --check`
  - Passed.

## Focused Evidence

- Result-size policy tests prove ordinary small case rows stay fully visible while many rows, grouped generated branches, and long rows compact.
- Result-size policy tests prove visually dense four-row substituted Cardano answers compact by formula weight, while smaller direct four-row Cardano cases stay fully visible.
- DisplayPanel UI tests prove a grouped formula answer initially shows the compact summary, mounts no case-row `data-raw-latex` math, preserves Copy Result, and renders rows plus `when` guards after expansion.
- AppMain responsiveness coverage proves editor hints update after a heavy formula case answer remains mounted in compact form.
- AppMain formula coverage proves `x^3+p*x^2*q+x=1` starts compact and does not mount full formula rows, while `x^3+p*x+2=0` remains a normal visible case answer.
- Scheduler tests prove collapsed math-heavy `mixed` detail blocks lazy-mount without lazy-mounting cheap prose-only mixed details.

## Remaining Gates

- None.
