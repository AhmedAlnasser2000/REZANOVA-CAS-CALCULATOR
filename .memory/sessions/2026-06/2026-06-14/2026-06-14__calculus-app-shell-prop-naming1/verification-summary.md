# CALCULUS-APP-SHELL-PROP-NAMING1 Verification Summary

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

`CALCULUS-APP-SHELL-PROP-NAMING1` renames current app-shell Calculus props, runtime-hook outputs, and app-logic dependency names while preserving legacy replay/schema/Guide compatibility fields.

## Commands

- `npx tsc -b --pretty false`
- `npm run test:ui -- src/app/runtime/useCalculusRuntime.ui.test.tsx src/AppMain.ui.test.tsx src/AppMain.status.ui.test.tsx`
- `npm run test:unit -- src/app/logic/runtimeControllers.test.ts src/app/logic/primaryActionRouter.test.ts src/app/logic/softActionRouter.test.ts src/app/logic/keypadRouter.test.ts src/app/logic/windowKeyRouter.ts`
- `npm run test:unit -- src/lib/app-state/history-schema.test.ts src/lib/navigation/launcher.test.ts src/lib/guide/content.test.ts`
- `npm run lint`
- `npm run build`
- `npm run test:file-sizes`
- `npm run test:memory-protocol`
- `git diff --check`

## Outcome

- TypeScript, focused UI/unit suites, lint, build, file-size, memory-protocol, and diff whitespace checks passed.

## Notes

- No file-size baseline update was required.
- The test plan's `src/app/logic/windowKeyRouter.ts` target was run exactly as requested; it is a source file target and did not introduce additional test cases.
