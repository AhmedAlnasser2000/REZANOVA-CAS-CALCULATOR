# CALCULUS-CORE-SPLIT1 Verification Summary

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

`CALCULUS-CORE-SPLIT1` removes the root `calculus-core.ts` file and moves its behavior into focused Calculus engine modules.

## Commands

- `npx tsc -b --pretty false`
- `npm run test:unit -- src/lib/calculus/engine/*.test.ts src/lib/calculus/workspace/*.test.ts`
- `npm run test:unit -- src/lib/symbolic-engine/integration.test.ts src/lib/symbolic-engine/limits.test.ts src/lib/engine/math-engine/*.test.ts src/lib/modes/calculate/*.test.ts`
- `npm run test:ui -- src/app/runtime/useCalculusRuntime.ui.test.tsx src/AppMain.ui.test.tsx src/AppMain.status.ui.test.tsx`
- `npm run lint`
- `npm run build`
- `node tools/validate-file-sizes.mjs --update-baseline`
- `npm run test:file-sizes`
- `npm run test:memory-protocol`
- `git diff --check`
- `git status --short`

## Outcome

- TypeScript passed.
- Focused Calculus engine/workspace tests passed.
- Symbolic Engine, Engine math execution, and Calculate mode downstream tests passed.
- Calculus runtime/AppMain UI regressions passed.
- Lint passed.
- Production build passed with existing Vite dynamic/static import chunking warnings.
- File-size baseline update removed the stale root `calculus-core.ts` cap; file-size ratchet passed afterward.
- Memory protocol passed.
- Diff whitespace check passed.

## Notes

- The checkout still contained unrelated in-progress `HistoryPanel` UI test and journal changes from another lane; they were not part of this milestone.
