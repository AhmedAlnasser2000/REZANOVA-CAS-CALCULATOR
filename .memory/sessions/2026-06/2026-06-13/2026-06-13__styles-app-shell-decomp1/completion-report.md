# STYLES-APP-SHELL-DECOMP1 Completion Report

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

Finish the app CSS decomposition in one major milestone by moving selector blocks out of `shell.css` into active app CSS ownership files without component, runtime, visual-design, Guide, or Keypad behavior changes.

## What Changed

- Reduced `src/styles/app/shell.css` to shell-core ownership: global tokens, app frame, mode strip, soft menu, launcher, shared top-level controls, and root responsive shell rules.
- Added `src/styles/app/side-surfaces.css` for history, settings, variables, left inspector, OOE diagnostics, and side-surface overlay/outboard placement.
- Added `src/styles/app/labs.css` for labs/dev-only styling.
- Filled `display.css`, `workspace-common.css`, `equation.css`, `advanced-calc.css`, `trigonometry.css`, `statistics.css`, `geometry.css`, and `linear-algebra.css` with moved selector blocks.
- Moved shared `guide-chip*`, `guide-chip-row`, `guide-related-links`, and notation-pad chip primitives to `workspace-common.css`.
- Preserved existing `guide.css` and `keypad.css` ownership.
- Updated `src/App.css` import order, `docs/architecture/styles-app-shell-surface-audit.md`, and `docs/README.md`.
- No file-size baseline update was required.

## Boundaries

- CSS selector relocation only.
- No selector renaming, component edits, visual redesign, runtime behavior, mode naming, Guide behavior, Keypad behavior, or non-CSS import-boundary changes.
- Mixed grouped selectors were kept intact and moved to the safest shared owner rather than rewritten.

## Verification

- `npx tsc -b --pretty false` passed.
- `npm run test:ui -- src/AppMain.ui.test.tsx src/AppMain.status.ui.test.tsx` passed.
- `npm run test:ui -- src/app/runtime/useCalculateRuntime.ui.test.tsx src/app/runtime/useCalculusRuntime.ui.test.tsx src/app/runtime/useGuideRuntime.ui.test.tsx` passed.
- `npm run test:ui -- src/app/runtime/useTrigonometryRuntime.ui.test.tsx src/app/runtime/useStatisticsRuntime.ui.test.tsx src/app/runtime/useGeometryRuntime.ui.test.tsx src/app/runtime/useTableRuntime.ui.test.tsx src/app/runtime/useLinearAlgebraTableShellRuntime.ui.test.tsx` passed.
- `npm run lint` passed.
- `npm run build` passed.
- `npm run test:file-sizes` passed.
- `npm run test:memory-protocol` passed.
- `git diff --check` passed.

## Commits

- Same-commit milestone: STYLES-APP-SHELL-DECOMP1.

## Follow-Ups

- Future CSS work should be targeted visual QA, small ownership corrections, or deliberate redesign work rather than another broad shell split.
