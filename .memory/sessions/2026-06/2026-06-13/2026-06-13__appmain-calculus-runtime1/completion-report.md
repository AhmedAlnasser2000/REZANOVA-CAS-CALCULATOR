# APPMAIN-CALCULUS-RUNTIME1 Completion Report

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors:
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live

## Task Goal

Extract the Calculus-owned runtime/menu/state/history/launch cluster from AppMain into one public hook while preserving AppMain as the cross-mode orchestration root.

## What Changed

- Added `src/app/runtime/useCalculusRuntime.ts`.
- Moved Calculus route/menu state, menu derived values, parent/back helpers, current-screen/full reset helpers, workbench state, advanced Calculus form state, refs, preview generation, seed application, history context, history replay restoration, and `runAdvancedCalcAction` into the hook.
- Kept a single public hook boundary. No additional public Calculus hook was introduced.
- Rewired `src/AppMain.tsx` to consume the hook while keeping cross-mode guide launches, launcher/history orchestration, Calculate legacy seed mapping, display badges, and shared shell plumbing in AppMain.
- Added `src/app/runtime/useCalculusRuntime.ui.test.tsx` for the extracted hook boundary.
- Ratcheted `tools/file-size-baseline.json` for `src/AppMain.tsx`.

## Internal Gates

- `APPMAIN-CALCULUS-RUNTIME1a`: navigation and menu state.
- `APPMAIN-CALCULUS-RUNTIME1b`: workbench state, refs, seeds, and preview.
- `APPMAIN-CALCULUS-RUNTIME1c`: reset, replay, and history context.
- `APPMAIN-CALCULUS-RUNTIME1d`: runtime launch.
- These were diff-only implementation checkpoints, not commits.

## Boundaries

- No solver/core changes.
- No schema changes.
- No display-policy changes.
- No worker-host, capability ID, or OOE policy changes.
- No global reducer, event bus, generic workspace runtime framework, or app-wide protocol.
- Preserved canonical `calculus` identity and legacy `advancedCalculus` read/replay compatibility.
- Preserved `calculus.evaluate`, `calculus-worker-runtime` / `calculus-runtime`, launch tickets, stale drop, cancellation, background History finalization, and variable-substitution snapshot policy.

## Verification

- `npx tsc -b --pretty false` passed.
- `npm run test:unit -- src/app/logic/primaryActionRouter.test.ts src/app/logic/softActionRouter.test.ts src/app/logic/keypadRouter.test.ts src/app/logic/expressionRouting.test.ts` passed.
- `npm run test:ui -- src/AppMain.ui.test.tsx -t "replays guided Calculus history|replays Calculus history"` passed.
- `npm run test:unit -- src/lib/modes/calculus-worker-client.test.ts src/lib/advanced-calc/engine.test.ts src/lib/advanced-calc/integrals.test.ts src/lib/advanced-calc/partials.test.ts src/lib/advanced-calc/navigation.test.ts src/lib/calculus/calculus-core.test.ts src/lib/calculus/calculus-strategy.test.ts src/lib/calculus/calculus-workbench.test.ts` passed.
- `npm run test:ui -- src/app/runtime/useCalculusRuntime.ui.test.tsx src/AppMain.ui.test.tsx` passed.
- `npm run lint` passed.
- `npm run build` passed.
- `node tools/validate-file-sizes.mjs --update-baseline`, then `npm run test:file-sizes` passed.
- `npm run test:memory-protocol` passed.
- `git diff --check` passed.

## Size Ratchet

- `src/AppMain.tsx`: 5,203 -> 4,582 lines.
- `src/app/runtime/useCalculusRuntime.ts`: 848 lines.
- `src/app/runtime/useCalculusRuntime.ui.test.tsx`: 381 lines.
- `tools/file-size-baseline.json` lowered the `src/AppMain.tsx` cap to 4,582.

## Follow-Ups

- Continue AppMain slimming only as fresh bounded slices.
- Do not use the internal `1a-d` gates as public commits or roadmap branches.
