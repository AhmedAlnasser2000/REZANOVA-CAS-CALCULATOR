# HISTORY-ROW-NOTATION-PREFERENCES1 Verification Summary

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

- `npm run test:ui -- src/app/shell/SettingsPage.ui.test.tsx src/app/shell/HistoryPage.ui.test.tsx src/components/HistoryPanel.ui.test.tsx src/app/shell/HistoryPerformanceConformance.ui.test.tsx`
- `npm run test -- src/lib/app-state/settings.test.ts`
- `npx tsc -b --pretty false`
- `git diff --check`

Partially blocked by unrelated active-agent work:

- `npm run test:file-sizes` now passes for files touched by this milestone, but the overall gate still fails because `src/lib/modes/equation/parameterized.ts` has 924 lines against a cap of 900. That file is unrelated to this History/Settings gate and is not staged.

## Coverage Notes

- Settings tests cover both History notation controls, red Rendered Math warning text, confirmation before enabling Rendered Math, cancel behavior, and schema defaults for old payloads.
- History tests cover quick-panel capped rendering, full-page virtualized rendering, explicit rendered-row math opt-in, and selected-inspector rich math preservation.
- Existing selection, Shift range selection, Ctrl/Cmd toggle, double-click replay, pending rows, and stop controls remain covered.
