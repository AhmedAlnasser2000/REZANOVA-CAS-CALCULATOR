# TRACK-VARIABLE-READBACK2 Manual Verification Checklist

status: completed
date: 2026-05-25
primary_agent: codex
primary_agent_model: gpt-5.5

## Scope

- Verify unsupported selected-target guidance is product-facing.
- Verify cube-root/power target-isolation gaps explain the mathematical blocker without adding solving.
- Verify adjacent-letter ambiguity and stored-value ignored policy remain visible through existing surfaces.
- Verify generic unsupported exact-family stops stay calm when no better target guidance is available.
- Verify no solver, parser, history, result-origin, or badge behavior changes.

## Manual Checks

- [x] `34x^3-z^2=25`, solve for `x`, explains unsupported cube-root isolation and suggests solving for `z` or numeric solve for `x`.
- [x] `z^3+a=0`, solve for `z`, keeps the generic unsupported exact-family boundary.
- [x] `az=1`, solve for `z`, keeps adjacent-letter ambiguity guidance and suggests explicit multiplication.
- [x] Equation symbolic with stored values still ignores stored values and preserves symbolic parameters.
- [x] Successful selected-target flows remain unchanged.

## Verification Commands

- [x] `npm run test:unit -- src/lib/modes/equation.test.ts src/lib/equation/equation-parameterized-readback.test.ts src/lib/algebra/variable-core.test.ts src/lib/algebra/variable-memory.test.ts`
- [x] `npm run test:ui -- src/AppMain.ui.test.tsx`
- [x] `npm run test:golden`
- [x] `npm run test:memory-protocol`
- [x] `npm run lint`
- [x] `npm run build`
