# TRACK-EQUATION-DOMAIN-INTENT1 Manual Verification Checklist

## Scope

- [x] Persist `settings.equationDomainIntent` with default `real`.
- [x] Add top-header `Complex Off` / `Complex On` quick toggle.
- [x] Thread Equation domain intent through symbolic runtime requests.
- [x] Include domain intent in Equation OOE input revisions and provenance.
- [x] Preserve Equation solver behavior for both real and complex intent.
- [x] Show `Domain intent: Complex` only when Complex is enabled.
- [x] Preserve real-first behavior and defer bounded complex answers to `COMPLEX-EQUATION1`.

## Boundaries

- [x] No complex solving.
- [x] No inequality solving.
- [x] No complex parser.
- [x] No stored complex values.
- [x] No non-Equation product adoption.
- [x] No OOE runtime behavior change.
- [x] No visible result semantics change beyond the Complex intent note.

## Verification

- [x] `npm run test:unit -- src/lib/app-state/settings.test.ts src/lib/app-state/tauri.test.ts src/lib/modes/equation.test.ts src/lib/ooe/equation-pilot.test.ts src/app/logic/runtimeControllers.test.ts`
- [x] `npm run test:ui -- src/AppMain.ui.test.tsx`
- [x] `npm run test:memory-protocol`
- [x] `npm run lint`
- [x] `npm run build`
- [x] `cargo check --manifest-path src-tauri/Cargo.toml`
