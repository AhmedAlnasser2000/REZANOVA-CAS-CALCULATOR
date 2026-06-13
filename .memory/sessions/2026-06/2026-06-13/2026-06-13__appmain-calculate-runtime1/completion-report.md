# APPMAIN-CALCULATE-RUNTIME1 Completion Report

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5
- contributors:
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5
- attribution_basis: live

## Task Goal

Extract Calculate-owned runtime, menu, workbench, replay, and launch state from AppMain while preserving AppMain as the cross-mode orchestration root.

## Recovery Note

This memory dossier was added after the implementation commit because the normal memory closeout step was missed when `0221b1f` was created. The recovery was recorded by amending the metadata-only memory commit, not by rewriting the original implementation commit.

## What Changed

- Added `src/app/runtime/useCalculateRuntime.ts`.
- Moved Calculate navigation/menu state, algebra tray state, standard Latex state, integral and limit workbench state, refs, route/menu derived values, selection helpers, seed/reset helpers, current history context, replay substitution handling, and Calculate runtime launch actions into the hook.
- Rewired `src/AppMain.tsx` to consume the hook while keeping cross-mode legacy Calculate-to-Calculus mapping at the app orchestration boundary.
- Kept derivative and derivative-at-point state/refs owned by `useCalculusRuntime` and shared into Calculate where needed.
- Added `src/app/runtime/useCalculateRuntime.ui.test.tsx`.
- Updated `src/app/logic/windowKeyRouter.ts` for the extracted Calculate routing boundary.
- Ratcheted `tools/file-size-baseline.json` for the AppMain shrink.

## Boundaries

- Preserved `calculate.evaluate`, `calculate.algebraTransform`, and `calculate.workbench` runtime semantics.
- No solver behavior, display policy, replay contract, capability ID, worker-host, OOE policy, schema, or global state-management changes.
- No global reducer, event bus, generic runtime framework, or Equation runtime extraction.

## Verification

- `npx tsc -b --pretty false` passed.
- `npm run test:ui -- src/app/runtime/useCalculateRuntime.ui.test.tsx` passed.
- `npm run test:unit -- src/app/logic/runtimeControllers.test.ts src/app/logic/primaryActionRouter.test.ts src/app/logic/softActionRouter.test.ts src/app/logic/keypadRouter.test.ts src/app/logic/expressionRouting.test.ts src/app/logic/editorRuntimeControl.test.ts` passed.
- `npm run test:ui -- src/AppMain.ui.test.tsx` passed.
- `node tools/validate-file-sizes.mjs --update-baseline`, then `npm run test:file-sizes` passed.

## Size Ratchet

- `src/AppMain.tsx`: 4,582 -> 4,282 lines.
- `src/app/runtime/useCalculateRuntime.ts`: 588 lines.
- `src/app/runtime/useCalculateRuntime.ui.test.tsx`: 400 lines.

## Commits

- `0221b1f` Extract Calculate runtime hook.

## Follow-Ups

- Continue AppMain slimming with the Linear/Table shell extraction as a separate public commit.
