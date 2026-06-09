# TRACK-TRIGONOMETRY-PERIOD-PHASE1-RUNTIME-SEED1 Manual Verification Checklist

## Attribution
- primary_agent: codex
- primary_agent_model: gpt-5.5
- attribution_basis: live

## Scope
- Add visible `Period & Phase` to the focused Trigonometry workspace.
- Add bounded expression-only affine `sin`/`cos`/`tan` period/phase analysis.
- Add typed Trigonometry replay seeds while preserving legacy hidden-screen replay.
- Add Guide coverage for phase shift and period/phase interpretation.
- Keep Geometry as audit-only and keep Trigonometry OOE/tickets deferred.

## Manual Checks
- [ ] Trigonometry home shows `Identities`, `Triangles`, `Angle Convert`, and `Period & Phase`.
- [ ] Trigonometry footer uses `1-4`, not `1-3` or `1-6`.
- [ ] `Period & Phase` opens from the home menu and accepts `2sin(3x-pi)+1`.
- [ ] The result reports normalized form, `P`, `h`, Wave Facts, and First Cycle Landmarks.
- [ ] Rendered Period & Phase output shows clean `\pi` math, not escaped `\\pi` artifacts.
- [ ] Tangent examples report period/asymptote facts without amplitude.
- [ ] Equations, inequalities, nested trig, symbolic parameters, non-affine arguments, abs/piecewise, and `sin^2(x)` stop cleanly.
- [ ] New Trigonometry history records carry `trigSeed` replay data for `periodPhase`.
- [ ] Legacy hidden Trig Function / Equation / Special Angles records still route forward as specified.
- [ ] Guide > Trigonometry includes a Period And Phase article explaining phase shift and first-cycle landmarks.

## Verification Commands
- `npm run test:unit -- src/lib/guide/content.test.ts src/lib/guide/content.contract.test.ts src/lib/trigonometry/*.test.ts src/lib/app-state/history-schema.test.ts src/lib/navigation/launcher.test.ts`
- `npm run test:ui -- src/AppMain.ui.test.tsx`
- `npm run test:memory-protocol`
- `npm run lint`
- `npm run build`
