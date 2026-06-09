# TRIGONOMETRY-SURFACE1 Verification Summary

## Attribution
- primary_agent: codex
- primary_agent_model: gpt-5.5
- attribution_basis: live

## Summary
`TRIGONOMETRY-SURFACE1` refocuses the visible Trigonometry workspace around guided trig experiences:

- `Identities`
- `Triangles`
- `Angle Convert`

Visible `Functions`, `Equations`, and `Special Angles` are removed from the Trigonometry home while their reusable helpers and legacy screen identifiers remain available. Legacy function/special-angle expression replay routes forward to Calculate; legacy trig-equation replay routes forward to Equation symbolic. The Guide now carries Unit Circle reference material through a visual diagram with concise special-angle notes.

## Verification
- Passed: `npm run test:unit -- src/lib/trigonometry/navigation.test.ts src/lib/guide/content.test.ts src/lib/guide/content.contract.test.ts src/lib/app-state/history-schema.test.ts`
- Passed: `npm run test:ui -- src/AppMain.ui.test.tsx`
- Passed: `npm run test:memory-protocol`
- Passed after removing one unused binding found by the first run: `npm run lint`
- Passed: `npm run build`

## Notes
- Included CI-facing maintenance from the same working set: unified Calculus e2e helpers, the old Advanced Calc smoke assertion update, and the Playwright timeout increase.
- The first focused UI attempt exposed an outdated Trigonometry Equation card expectation; the test was updated to assert the new focused Trigonometry home instead.
