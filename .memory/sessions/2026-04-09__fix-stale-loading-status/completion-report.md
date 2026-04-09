# Completion Report

## Attribution
- primary_agent: codex
- primary_agent_model: gpt-5.4
- contributors:
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.4
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.4
- attribution_basis: live

## Task Goal
- Fix the stale `Loading...` display-header status so the calculator shell reports readiness once the usable shell bootstrap completes, even if slower background history/category loads are still pending.

## What Changed
- Split the startup effect in `src/AppMain.tsx` so `hydrated` now tracks the shell bootstrap (`bootApp`) instead of waiting on unrelated background loads for history and launcher categories.
- Kept `loadHistoryEntries()` and `loadLauncherCategories()` as background updates so those datasets can continue hydrating without blocking the visible ready state.
- Added a dedicated `data-testid="display-status"` hook in `src/AppMain.tsx` to make the header-status regression testable.
- Added `src/AppMain.status.ui.test.tsx`, which mocks slow background loaders and verifies the display header flips to `Ready` after shell bootstrap instead of staying on `Loading...`.

## Verification
- `npm run test:ui -- src/AppMain.ui.test.tsx src/AppMain.status.ui.test.tsx`
- `npx eslint src/AppMain.tsx src/AppMain.status.ui.test.tsx`

## Commits
- Pending user approval.

## Follow-Ups
- The `1 / \sqrt{u}` rewrite remains mathematically valid; if we want to polish its presentation later, treat that as a separate notation/readability pass rather than part of this loading-state fix.
