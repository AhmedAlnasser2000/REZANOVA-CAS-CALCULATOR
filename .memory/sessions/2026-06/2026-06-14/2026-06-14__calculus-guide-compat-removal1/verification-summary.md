# CALCULUS-GUIDE-COMPAT-REMOVAL1 Verification Summary

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

`CALCULUS-GUIDE-COMPAT-REMOVAL1` removes legacy Guide domain/capability/article compatibility and keeps guided Calculus content canonical.

## Commands

- `npx tsc -b --pretty false`
- `npm run test:unit -- src/lib/guide/content.test.ts src/lib/guide/search.test.ts src/lib/guide/symbols.test.ts src/lib/guide/navigation.test.ts`
- `npm run test:unit -- src/lib/virtual-keyboard/*.test.ts src/lib/navigation/launcher.test.ts`
- `npm run test:ui -- src/app/runtime/useGuideRuntime.ui.test.tsx src/AppMain.ui.test.tsx`
- `npm run test:file-sizes`
- `npm run test:memory-protocol`
- `git diff --check`

## Outcome

- TypeScript passed.
- Focused Guide content, search, symbols, and navigation tests passed.
- Virtual-keyboard and launcher tests passed.
- Guide runtime UI and AppMain UI tests passed.
- File-size, memory protocol, and diff whitespace checks passed.

## Notes

- Remaining exact legacy-name matches are internal Calculus/variable-memory naming surfaces reserved for the final closure commit.
