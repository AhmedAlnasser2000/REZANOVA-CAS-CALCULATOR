# POLY-RAD1 Verification Summary

## Attribution
- primary_agent: codex
- primary_agent_model: gpt-5.4
- contributors:
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.4
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.4
- attribution_basis: historical-user-confirmed

- Focused checks:
  - `npm run test:unit -- src/lib/polynomial-factor-solve.test.ts src/lib/math-engine.test.ts src/lib/equation/shared-solve.test.ts src/AppMain.ui.test.tsx`
  - `npm run test:ui -- --run src/AppMain.ui.test.tsx`
  - `npm run build`
  - `npx playwright test e2e/qa1-smoke.spec.ts -g "POLY-RAD1"`
- Full gate:
  - `npm run test:gate`

## Notes

- The shared-engine changes landed cleanly; the main late-stage fixes were assertion and surface-shape adjustments, not solver regressions:
  - bounded biquadratic exact output is mathematically correct but may serialize the inner algebraic constants as either `\sqrt{13}` or `13^{1/2}` depending on the Compute Engine simplification path, so tests now assert the bounded exact content instead of one cosmetic form
  - repeated biquadratic factor multiplicity is now preserved internally even though user-facing factor LaTeX still renders repeated factors as `(x^2-5)(x^2-5)` rather than a power form
  - direct Playwright reruns required a fresh `npm run build` because preview serves the existing `dist`; once rebuilt, the new POLY-RAD1 smoke passed cleanly
