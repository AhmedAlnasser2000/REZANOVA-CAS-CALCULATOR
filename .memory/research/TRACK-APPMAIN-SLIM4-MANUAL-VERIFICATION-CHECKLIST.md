# TRACK-APPMAIN-SLIM4 Manual Verification Checklist

date: 2026-05-21
primary_agent: codex
primary_agent_model: gpt-5.5
milestone: APPMAIN-SLIM4
status: implemented-awaiting-user-review

## Scope

- Extract Matrix and Vector runtime state/actions from `src/AppMain.tsx` into `useLinearAlgebraRuntime`.
- Extract Table runtime state/actions from `src/AppMain.tsx` into `useTableRuntime`.
- Add a view-only Matrix/Vector/Table workspace host.
- Preserve refs, global routing, keyboard registration, history replay, display outcome ownership, and cross-mode orchestration in AppMain.

## Manual Checks

- [ ] Matrix mode still edits A/B cells and runs add, subtract, multiply, transpose, determinant, and inverse through soft keys.
- [ ] Matrix notation pad presets still load current A/B values, show the same notice, and refocus the notation editor.
- [ ] Vector mode still edits A/B cells and runs dot, cross, norm, angle, add, and subtract with the active angle unit.
- [ ] Vector notation pad presets still load current A/B values, show the same notice, and refocus the notation editor.
- [ ] Table mode still edits primary/secondary expressions, range values, toggles the secondary function, runs tables, and clears the table draft.
- [ ] Launcher, history replay, global keyboard, soft keys, and keypad behavior remain unchanged.

## Verification

- [x] `wc -l src/AppMain.tsx` before: `5619`
- [x] `wc -l src/AppMain.tsx` after: `5501`
- [x] `npm run test:unit -- src/app/logic/primaryActionRouter.test.ts src/app/logic/keypadRouter.test.ts src/app/logic/softActionRouter.test.ts src/app/logic/runtimeControllers.test.ts src/lib/linear-algebra-workbench.test.ts src/lib/matrix.test.ts src/lib/vector.test.ts src/lib/modes/table.test.ts`
- [x] `npm run build`
- [x] `npm run test:golden`
- [x] `npm run test:ui`
- [x] `npm run lint`
- [x] `npm run test:memory-protocol`
- [x] `npx playwright test e2e/qa1-smoke.spec.ts --project=chromium`
- [x] `npx playwright test e2e/calc-audit0-smoke.spec.ts --project=chromium`

## Notes

- The narrow Matrix/Vector/Table slice reduced AppMain meaningfully but did not reach the earlier `5400` minimum target.
- Reaching that line-count threshold should be handled by a separate follow-up extraction rather than widening SLIM4 beyond its scoped ownership cluster.
