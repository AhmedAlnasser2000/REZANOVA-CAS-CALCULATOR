# Angle Unit Direct Trig Fix

## Attribution
- primary_agent: codex
- primary_agent_model: gpt-5.4
- contributors:
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.4
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.4
- attribution_basis: historical-user-confirmed

- Gate: `ui`
- Status: verified, not committed

## Delivered
- Removed the old `Calculate` policy that exempted `\pi`-based numeric trig arguments from angle-unit conversion.
- Updated the bounded trig-function angle parser so `\pi`-based numeric angles are interpreted in the currently selected `DEG`, `RAD`, or `GRAD` mode instead of only behaving specially in `RAD`.
- Added regression coverage for engine, UI, and browser smoke behavior around `sin(\pi/2)` under unit switching.

## Main Files
- `src/lib/math-engine.ts`
- `src/lib/trigonometry/angles.ts`
- `src/lib/math-engine.test.ts`
- `src/lib/trigonometry/functions.test.ts`
- `src/AppMain.ui.test.tsx`
- `e2e/qa1-smoke.spec.ts`

## Notes
- This changes the earlier behavior where `Calculate` silently preserved radian meaning for `\pi`-based direct trig input outside `RAD`.
- The broader full Playwright gate still has the separate preview-server dropout on the older narrow-overlay settings smoke; the focused angle-unit browser smoke passed.
