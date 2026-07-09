# APPMAIN-CALCULATE-RUNTIME1 Verification Summary

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors:
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live
- commit_hash: `0221b1f`

## Scope

`APPMAIN-CALCULATE-RUNTIME1` extracts Calculate runtime ownership into `useCalculateRuntime` while preserving AppMain as orchestration root.

## Commands

- `npx tsc -b --pretty false`
- `npm run test:ui -- src/app/runtime/useCalculateRuntime.ui.test.tsx`
- `npm run test:unit -- src/app/logic/runtimeControllers.test.ts src/app/logic/primaryActionRouter.test.ts src/app/logic/softActionRouter.test.ts src/app/logic/keypadRouter.test.ts src/app/logic/expressionRouting.test.ts src/app/logic/editorRuntimeControl.test.ts`
- `npm run test:ui -- src/AppMain.ui.test.tsx`
- `node tools/validate-file-sizes.mjs --update-baseline`
- `npm run test:file-sizes`

## Manual Checks

- Confirmed Calculate legacy calculus seed mapping remained at the AppMain/app-flow boundary.
- Confirmed derivative and derivative-at-point state remained shared from the Calculus runtime hook.

## Outcome

All planned Calculate runtime checks passed before `0221b1f`. This record was added later because the memory closeout step was missed.

## Outstanding Gaps

No known `APPMAIN-CALCULATE-RUNTIME1` gaps.
