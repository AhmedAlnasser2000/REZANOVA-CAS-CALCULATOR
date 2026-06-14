# CALCULUS-GUIDED-WORKSPACE-MERGE1 Verification Summary

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

`CALCULUS-GUIDED-WORKSPACE-MERGE1` is a structure-only path merge and live implementation export rename for the guided Calculus workspace district.

## Commands

- `npx tsc -b --pretty false`
- `npm run test:unit -- src/lib/calculus/workspace/*.test.ts`
- `npm run test:unit -- src/lib/calculus/calculus-core.test.ts src/lib/calculus/calculus-workbench.test.ts src/lib/calculus/calculus-strategy.test.ts`
- `npm run test:unit -- src/lib/modes/calculus-worker-runtime.test.ts src/lib/app-state/history-schema.test.ts src/lib/guide/content.test.ts`
- `npm run test:unit -- src/lib/modes/calculus-worker-client.test.ts`
- `npm run test:unit -- src/app/logic/runtimeControllers.test.ts src/app/logic/windowKeyRouter.ts`
- `npm run test:ui -- src/app/runtime/useCalculusRuntime.ui.test.tsx src/AppMain.ui.test.tsx src/AppMain.status.ui.test.tsx`
- `npm run test:file-sizes`
- `npm run test:memory-protocol`
- `git diff --check`

## Outcome

- TypeScript passed after moved relative imports were corrected.
- Guided Calculus workspace tests passed: 8 files, 37 tests.
- Shared Calculus tests passed: 3 files, 21 tests.
- History schema and Guide content tests passed.
- The planned local `src/lib/modes/calculus-worker-runtime.test.ts` path was not present in this tree; Vitest ran matching files in that command, and the existing `src/lib/modes/calculus-worker-client.test.ts` passed separately.
- Runtime-controller and UI tests passed, including the full AppMain UI suite.
- File-size ratchet passed without a baseline update.
- Memory protocol and diff whitespace checks passed.

## Notes

- The planned local `src/lib/modes/calculus-worker-runtime.test.ts` path was treated as a stale test-plan name; the existing worker coverage lives at `src/lib/modes/calculus-worker-client.test.ts`.
