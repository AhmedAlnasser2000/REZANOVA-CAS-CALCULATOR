# HISTORY-PERF-CONFORMANCE1 Verification Summary

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live

## Verification

Passed:

- `npm run test:ui -- src/app/shell/HistoryPerformanceConformance.ui.test.tsx`
- `npm run test:ui -- src/AppMain.workspace-tabs.ui.test.tsx src/app/shell/WorkspaceTabs.ui.test.tsx src/app/shell/ActiveSurfaceHost.ui.test.tsx src/app/shell/SettingsPage.ui.test.tsx src/app/shell/HistoryPage.ui.test.tsx src/app/shell/HistoryPerformanceConformance.ui.test.tsx src/components/SettingsPanel.ui.test.tsx src/components/HistoryPanel.ui.test.tsx`
- `npm run test:memory-protocol`
- `git diff --check`

Known unrelated failure:

- `npx tsc -b --pretty false` still fails in the pre-existing `src/app/runtime/editorTargets.ts` type issue (`Selector` overload and `never` mathfield methods), outside this History milestone.
- `npm run test:file-sizes` currently fails because unrelated active shared-checkout files exceed their caps: `src/lib/equation/analysis-evidence.ts` is 971 lines over cap 900, and `src/types/calculator/runtime-types.ts` is 1346 lines over cap 1341. Those files are not staged for this History conformance commit.

## Coverage Notes

- Quick panel conformance covers the 20 committed-row cap plus pending rows.
- Full page conformance covers bounded visible virtual rows and no row-level rich math.
- Selected inspector conformance keeps rich math available where detail belongs.
- Pending elapsed conformance keeps running labels live without page-parent ticker state.
