# CALCULUS-LEGACY-SCHEMA-CLOSURE1 Verification Summary

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors:
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live

## Scope

`CALCULUS-LEGACY-SCHEMA-CLOSURE1` removes legacy Advanced Calculus schema/replay compatibility and switches live persisted Calculus fields to canonical names.

## Commands

- `npx tsc -b --pretty false`
- `npm run test:unit -- src/lib/app-state/history-schema.test.ts src/lib/navigation/launcher.test.ts src/lib/ooe/bridge-schema/ooe-bridge.test.ts`
- `npm run test:unit -- src/app/logic/runtimeControllers.test.ts src/app/logic/windowKeyRouter.ts src/lib/calculus/workspace/*.test.ts`
- `npm run test:ui -- src/app/runtime/useCalculusRuntime.ui.test.tsx src/app/runtime/useHistoryDisplayRuntime.ui.test.tsx src/AppMain.ui.test.tsx`
- `npm run test:unit -- src/lib/guide/content.test.ts`
- `npm run test:file-sizes`
- `npm run test:memory-protocol`
- `git diff --check`

## Outcome

- TypeScript passed.
- Focused schema, launcher, and OOE bridge tests passed.
- Runtime controller, window key router, and Calculus workspace tests passed.
- Calculus runtime, History/Display runtime, and AppMain UI tests passed.
- Guide content compatibility checks passed for the intentional intermediate boundary.
- File-size, memory protocol, and diff whitespace checks passed.

## Notes

- Remaining legacy Guide compatibility and internal `advanced-calc` naming are intentionally deferred to the next two planned commits in the same session.
