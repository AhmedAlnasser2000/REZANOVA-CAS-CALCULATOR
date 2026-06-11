# TRACK-CALCULUS-CANONICAL-ID1 Manual Verification Checklist

## Scope

This checklist covers the live Calculus identity cleanup after `OOE-RS32`. New runtime, guide-launch, OOE, and History paths should emit canonical `calculus` / `calculus.evaluate` identity. Legacy `advancedCalculus` remains accepted for read/replay compatibility only.

## Manual Checks

- [ ] Run a visible Calculus evaluation and confirm new History uses `mode: calculus`.
- [ ] Inspect OOE diagnostics for a new Calculus run and confirm `capabilityId: calculus.evaluate`.
- [ ] Launch Calculus guide examples for derivatives, integrals, limits, series, partials, and ODEs; confirm they open the visible Calculus workspace.
- [ ] Replay a legacy `advancedCalculus` fixture/history record and confirm it maps forward to visible Calculus.
- [ ] Confirm no visible `Advanced Calc` launcher/mode guide entry is reintroduced.

## Automated Checks

- [ ] `npm run test:unit -- src/lib/app-state/history-schema.test.ts src/lib/ooe/workspace-pilot.test.ts src/lib/ooe/ooe-bridge.test.ts src/lib/advanced-calc/*.test.ts`
- [ ] `npm run test:ui -- src/AppMain.ui.test.tsx`
- [ ] `npm run lint`
- [ ] `npm run build`

## Boundaries

- No deletion of `src/lib/advanced-calc/*`.
- No compatibility retirement.
- No solver, OOE runtime-shell, display, or history schema redesign.
- No migration of hidden Trigonometry, guided Calculate compatibility, or `calculate.workbench`.
