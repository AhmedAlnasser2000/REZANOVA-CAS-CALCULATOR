# APPMAIN-CALCULUS-RUNTIME1 Verification Summary

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5
- contributors:
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5
- attribution_basis: live

## Scope

`APPMAIN-CALCULUS-RUNTIME1` extracts Calculus runtime ownership into `useCalculusRuntime` while preserving AppMain as the cross-mode orchestration root.

## Commands

- `npx tsc -b --pretty false`
- `npm run test:ui -- src/app/runtime/useCalculusRuntime.ui.test.tsx`
- `npm run test:unit -- src/app/logic/primaryActionRouter.test.ts src/app/logic/softActionRouter.test.ts src/app/logic/keypadRouter.test.ts src/app/logic/expressionRouting.test.ts`
- `npm run test:ui -- src/AppMain.ui.test.tsx -t "replays guided Calculus history|replays Calculus history"`
- `npm run test:unit -- src/lib/modes/calculus-worker-client.test.ts src/lib/advanced-calc/engine.test.ts src/lib/advanced-calc/integrals.test.ts src/lib/advanced-calc/partials.test.ts src/lib/advanced-calc/navigation.test.ts src/lib/calculus/calculus-core.test.ts src/lib/calculus/calculus-strategy.test.ts src/lib/calculus/calculus-workbench.test.ts`
- `npm run test:ui -- src/app/runtime/useCalculusRuntime.ui.test.tsx src/AppMain.ui.test.tsx`
- `npm run lint`
- `npm run build`
- `node tools/validate-file-sizes.mjs --update-baseline`
- `npm run test:file-sizes`
- `npm run test:memory-protocol`
- `git diff --check`

## Outcome

All planned Calculus checks passed. The final combined UI run covered 132 tests.

## Outstanding Gaps

No known `APPMAIN-CALCULUS-RUNTIME1` gaps. The internal gates were implementation checkpoints only and should not be treated as separate public milestones.
