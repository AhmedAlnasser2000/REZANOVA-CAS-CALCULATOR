# GUIDE-CONTENT-REALITY-FIX1 Verification Summary

## Attribution
- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors: none
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live
- commit_hash: pending

## Commands
- `npm run test:unit -- src/lib/guide/content.test.ts src/lib/guide/content.contract.test.ts src/lib/guide/navigation.test.ts src/lib/guide/search.test.ts src/lib/guide/symbols.test.ts`
  - Result: passed, 5 files / 27 tests.
- `npm run test:ui -- src/app/shell/GuidePage.ui.test.tsx src/app/runtime/useGuideRuntime.ui.test.tsx src/AppMain.workspace-tabs.ui.test.tsx src/app/shell/ActiveSurfaceHost.ui.test.tsx src/app/shell/WorkspaceTabs.ui.test.tsx`
  - Result: passed, 5 files / 31 tests.
- `npm run test:memory-protocol`
  - Result: passed.
- `npm run test:file-sizes`
  - Result: passed.
- `git diff --check`
  - Result: passed.

## Evidence Summary
- Statistics is active in `ACTIVE_CAPABILITIES`, so the Guide home/domain path now exposes Statistics intentionally.
- `trig-period-phase` and `statistics-inference` are reachable from their active domains and remain reachable through mode refs/search.
- First-use Guide identity copy now uses `REZANOVA CLASSWIZ CALCULATOR` instead of leading with a friendly alias.

## Not Run
- Playwright visual math-output verification was not required for this gate because it changed Guide taxonomy/content contracts only and did not change rendered solver output.
- Public overview text checks are deferred to `PUBLIC-OVERVIEW-CATCHUP1`.
