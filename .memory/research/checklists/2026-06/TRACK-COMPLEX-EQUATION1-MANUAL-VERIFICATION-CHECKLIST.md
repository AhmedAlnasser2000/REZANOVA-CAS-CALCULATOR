# TRACK-COMPLEX-EQUATION1 Manual Verification Checklist

## Scope

- [x] Keep Complex Off behavior real-first and unchanged.
- [x] Allow bounded complex Equation answers only when `Complex On` and answer mode is `Exact`.
- [x] Add optional answer-domain metadata for complex Equation outcomes and history replay.
- [x] Mark complex-domain Equation result cards with a visible domain chip/note.
- [x] Add bounded symbolic quadratic complex branches for negative discriminants.
- [x] Add bounded selected-target power complex branches for simple isolated powers.
- [x] Preserve `Approximate` as real numeric interval solving only.
- [x] Preserve `Isolate` as textbook rearrangement only.
- [x] Keep guided polynomial screens behavior-stable while allowing complex-domain metadata when Complex is enabled.
- [x] Thread answer-domain evidence into Equation OOE provenance.

## Boundaries

- [x] No complex parser.
- [x] No stored complex values.
- [x] No complex approximate search.
- [x] No inequality solving.
- [x] No non-Equation product adoption.
- [x] No broad transcendental complex solving.
- [x] No OOE runtime behavior change.

## Verification

- [x] `npm run test:unit -- src/lib/modes/equation.test.ts src/lib/equation/equation-algebraic-isolation.test.ts src/lib/numeric/complex.test.ts src/lib/algebra/value-domain-core.test.ts src/lib/ooe/equation-pilot.test.ts src/app/logic/runtimeControllers.test.ts`
- [x] `npm run test:unit -- src/lib/app-state/settings.test.ts src/lib/app-state/tauri.test.ts`
- [x] `npm run test:ui -- src/AppMain.ui.test.tsx`
- [x] `npm run test:memory-protocol`
- [x] `npm run lint`
- [x] `npm run build`
- [x] `cargo check --manifest-path src-tauri/Cargo.toml`
