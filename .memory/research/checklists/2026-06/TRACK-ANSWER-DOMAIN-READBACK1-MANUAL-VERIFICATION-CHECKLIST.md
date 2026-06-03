# TRACK-ANSWER-DOMAIN-READBACK1 Manual Verification Checklist

## Scope

- [x] Keep the milestone readback/layout polish only.
- [x] Fix persisted History bootstrap layout with many records.
- [x] Keep collapsed History cards compact and non-shrinking.
- [x] Show only input preview plus mode/replay/delete/expand controls while collapsed.
- [x] Show answer, approximation, domain/solution labels, and valid-when facts only when expanded.
- [x] Keep expanded History content contained with vertical/horizontal scrolling.
- [x] Preserve replay-on-card-click, per-entry delete, clear-all, close, and compact overlay/outboard behavior.
- [x] Suppress duplicate `Domain intent: Complex` when actual result domain is complex.
- [x] Preserve `Domain intent: Complex` for ordered inequalities with `Solution: Inequality set`.
- [x] Keep ordinary real-first results quiet.
- [x] Fix prose readback for ASCII inequality operators such as `<=`, `>=`, and `!=`.
- [x] Keep inequality main answers compact.
- [x] Normalize simple bounded complex branch products where safe.

## Boundaries

- [x] No new solver family.
- [x] No broad inequality solver.
- [x] No broad complex polynomial route.
- [x] No complex parser.
- [x] No stored complex variables.
- [x] No stored-value policy change.
- [x] No OOE runtime behavior change.
- [x] No non-Equation inequality/complex adoption.
- [x] No history schema change.

## Verification

- [x] `npm run test:unit -- src/lib/modes/equation.test.ts src/lib/algebra/inequality-core.test.ts src/lib/algebra/assumption-readback.test.ts src/lib/numeric/complex.test.ts`
- [x] `npm run test:unit -- src/lib/display/math-notation.test.ts src/lib/algebra/assumption-readback.test.ts`
- [x] `npm run test:ui -- src/AppMain.ui.test.tsx src/components/HistoryPanel.ui.test.tsx`
- [x] `npm run test:memory-protocol`
- [x] `npm run lint`
- [x] `npm run build`
