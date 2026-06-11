# TRACK-DISPLAY-RENDER-SCHEDULER1 Manual Verification Checklist

## Scope
- Progressive display-only reveal of committed `DisplayBlock`s.
- No OOE, solver, history, or copy semantics changes.

## Manual Checks
- Answer or error text appears before Valid When/detail-heavy sections.
- `Valid when` appears after the answer without blocking first answer paint.
- Approximation/warnings, periodic-family blocks, and details appear later in that order.
- Display status shows `Rendering result` only while committed blocks remain queued.
- Metadata chips and action buttons are visible immediately.
- Copy Result still copies full canonical result content.

## Verification Commands
- `npm run test:unit -- src/lib/display/*.test.ts`
- `npm run test:ui -- src/AppMain.ui.test.tsx src/components/MathStatic.ui.test.tsx`
- `npm run lint`
- `npm run build`
