# STYLES-APP-SHELL-DECOMP1 Verification Summary

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

`STYLES-APP-SHELL-DECOMP1` is a selector-relocation refactor of `src/styles/app/`. It decomposes `shell.css` into active app CSS ownership files and keeps Guide/Keypad extracts stable.

## Commands

- `npx tsc -b --pretty false`
- `npm run test:ui -- src/AppMain.ui.test.tsx src/AppMain.status.ui.test.tsx`
- `npm run test:ui -- src/app/runtime/useCalculateRuntime.ui.test.tsx src/app/runtime/useCalculusRuntime.ui.test.tsx src/app/runtime/useGuideRuntime.ui.test.tsx`
- `npm run test:ui -- src/app/runtime/useTrigonometryRuntime.ui.test.tsx src/app/runtime/useStatisticsRuntime.ui.test.tsx src/app/runtime/useGeometryRuntime.ui.test.tsx src/app/runtime/useTableRuntime.ui.test.tsx src/app/runtime/useLinearAlgebraTableShellRuntime.ui.test.tsx`
- `npm run lint`
- `npm run build`
- `npm run test:file-sizes`
- `npm run test:memory-protocol`
- `git diff --check`

## Manual Checks

- Confirmed `src/App.css` imports `side-surfaces.css` and `labs.css` in the planned order.
- Confirmed `shell.css` no longer owns display/result, side-surface, labs, mode-panel, or broad workspace selector families.
- Confirmed `guide.css` and `keypad.css` were not pulled back into the shell.
- Confirmed all app CSS files stay under the default line cap.

## Outcome

All planned CSS decomposition checks passed.

## Outstanding Gaps

No known `STYLES-APP-SHELL-DECOMP1` gaps.
