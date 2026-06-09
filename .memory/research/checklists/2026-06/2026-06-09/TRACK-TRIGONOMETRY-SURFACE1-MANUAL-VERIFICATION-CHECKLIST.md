# TRACK-TRIGONOMETRY-SURFACE1 Manual Verification Checklist

## Attribution
- primary_agent: codex
- primary_agent_model: gpt-5.5
- attribution_basis: live

## Scope
- Refocus visible Trigonometry to guided workflows only.
- Preserve reusable trig cores and legacy replay compatibility.
- Move special-angle reference into Guide as a visual Unit Circle article.

## Manual Checks
- [ ] Trigonometry home shows only `Identities`, `Triangles`, and `Angle Convert`.
- [ ] Trigonometry footer uses `1-3`, not `1-6`.
- [ ] `Functions`, `Equations`, and `Special Angles` are not visible Trigonometry home cards.
- [ ] Legacy Trig Function history replay opens Calculate with the original input.
- [ ] Legacy Trig Equation history replay opens Equation symbolic with the original relation.
- [ ] Legacy Trig Special Angles expression replay opens Calculate with the original input.
- [ ] Guide > Trigonometry includes a Unit Circle article with a real diagram and concise special-angle notes.
- [ ] Guide wording points broad trig equation solving to Equation.
- [ ] Calculate direct trig values and Equation trig-solving routes remain stable.

## Verification Commands
- `npm run test:unit -- src/lib/trigonometry/navigation.test.ts src/lib/guide/content.test.ts src/lib/guide/content.contract.test.ts src/lib/app-state/history-schema.test.ts`
- `npm run test:ui -- src/AppMain.ui.test.tsx`
- `npm run test:memory-protocol`
- `npm run lint`
- `npm run build`
