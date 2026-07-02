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

`SETTINGS-HISTORY-PAGE-SURFACES1` adds Settings and History as live singleton app-page workspace kinds outside `.calculator-shell`.

What changed:

- Added app-page workspace kinds for `settings` and `history`.
- Kept quick Settings and History side inspectors intact and added open-full-page header affordances.
- Added a small adjacent plus-menu in Sculpted Chrome for New Calculate, Open Settings Page, and Open History Page.
- Rendered Settings and History through `ActiveSurfaceHost` as app pages with null Order of Execution runtime context.
- Built `SettingsPage` over the existing `SettingsPanel` controls, state, and patch handlers.
- Built `HistoryPage` as a virtualized ledger over existing `HistoryEntry` plus pending-ticket data, with local-date timeline groups, search, workspace filters, selected-entry details, current-tab/new-tab replay, copy, delete, stop pending, selection, and bulk delete.

Boundaries preserved:

- Settings and History are not calculator `ModeId`s.
- Quick inspectors remain first-class fast-access surfaces.
- Formula Viewer remains separate and current-output-only for dense Display artifacts.
- History does not expose Formula Viewer actions from persisted records.
- No History schema migration, export/import, project/saved-work management, Graphing, Spreadsheet, Variables page, Surface Protocol adapter, plugin, or remote-compute work was added.

## Durable Memory Updated

- `.memory/current-state.md`
- `.memory/decisions.md`
- `.memory/journal/2026-07/2026-07-01.md`
- `.memory/sessions/2026-07/2026-07-01/2026-07-01__settings-history-page-surfaces1/completion-report.md`
- `.memory/sessions/2026-07/2026-07-01/2026-07-01__settings-history-page-surfaces1/verification-summary.md`
