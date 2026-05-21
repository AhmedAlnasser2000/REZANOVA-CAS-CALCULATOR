# NP1 Verification Summary

## Attribution
- primary_agent: codex
- primary_agent_model: gpt-5.4
- contributors:
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.4
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.4
- attribution_basis: historical-user-confirmed

## Automated Gate
- `npm run test:gate`

## Focused Coverage Added / Updated
- `src/lib/numeric-output.test.ts`
  - digit clamping
  - decimal / scientific / auto notation
  - `×10^n` vs `e` scientific styles
  - auto threshold switching and small-number decimal handling
- `src/lib/settings.test.ts`
  - persisted settings coverage for `approxDigits`, notation mode, and scientific style
- `src/lib/equation/guarded-solve.test.ts`
  - guarded domain-aware wording
  - decimal-only symbolic Equation success handling
- `src/lib/modes/equation.test.ts`
  - Equation exact-vs-approx result classification
- `src/AppMain.ui.test.tsx`
  - live settings updates for numeric output controls
  - visible Equation result cleanup and domain-aware wording
- `e2e/qa1-smoke.spec.ts`
  - settings-driven digit/notation changes
  - symbolic Equation decimal-only approx rendering
  - preserved-domain rejection wording

## Outcome
- Passed

## Notes
- The verified `PRL4` checkpoint was committed first as `744bdf5` before this follow-up began.
- Gate still prints the previously known Compute Engine stderr noise in some trig tests, but assertions passed.
