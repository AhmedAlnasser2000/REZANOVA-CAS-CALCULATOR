# WORKSPACE-PAGE-SURFACE-GUARDRAILS1 Completion Report

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5-codex
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5-codex
- verified_by_agent: codex
- verified_by_agent_model: gpt-5-codex
- attribution_basis: live

## Summary

`WORKSPACE-PAGE-SURFACE-GUARDRAILS1` locks page-surface guardrails for scale, inspector policy, and Settings switch visibility.

What changed:

- Added `allowsQuickInspectors` to workspace surface descriptors.
- Calculator-like workspaces allow quick inspectors; page surfaces such as Settings, History, and Formula Viewer deny them.
- `AppMain` suppresses and closes global side/left inspector hosts when the active tab is a page surface.
- Moved UI scale off the app frame and onto the calculator shell, so tabs and full pages stay stable while calculator workspace content scales.
- Moved side-surface overlay/outboard geometry below the app tab chrome.
- Added one shared `SettingsSwitch` and adopted it in full Settings plus quick Settings.

Boundaries preserved:

- No Settings/History feature expansion, History schema migration, Graphing, Spreadsheet, Variables page, Surface Protocol adapter, or Order of Execution behavior changed.
- Quick inspectors remain available for calculator-like workspaces.

## Durable Memory Updated

- `.memory/current-state.md`
- `.memory/decisions.md`
- `.memory/journal/2026-07/2026-07-02.md`
- `.memory/sessions/2026-07/2026-07-02/2026-07-02__workspace-page-surface-guardrails1/completion-report.md`
- `.memory/sessions/2026-07/2026-07-02/2026-07-02__workspace-page-surface-guardrails1/verification-summary.md`
- `.memory/sessions/2026-07/2026-07-02/2026-07-02__workspace-page-surface-guardrails1/commit-log.md`
