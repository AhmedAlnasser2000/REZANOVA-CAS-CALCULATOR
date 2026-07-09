# SETTINGS-HISTORY-VISUAL-FIDELITY1 Verification Summary

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

- `npm run test:ui -- src/AppMain.workspace-tabs.ui.test.tsx src/app/shell/WorkspaceTabs.ui.test.tsx src/app/shell/ActiveSurfaceHost.ui.test.tsx src/app/shell/SettingsPage.ui.test.tsx src/app/shell/HistoryPage.ui.test.tsx src/components/SettingsPanel.ui.test.tsx src/components/HistoryPanel.ui.test.tsx`
- `npm run test:ui -- src/app/shell/WorkspaceTabs.ui.test.tsx src/app/shell/HistoryPage.ui.test.tsx`
- `git diff --check`

Blocked by unrelated active-agent work:

- `npm run test:memory-protocol` currently fails because `.memory/sessions/2026-07/2026-07-02/2026-07-02__calculus-limits-ui-polish1/commit-log.md` is missing the required `primary_agent` attribution field. That dossier is outside this milestone.
- `npm run test:file-sizes` currently fails because `src/lib/equation/numeric-domain-segmentation.ts` has 928 lines against a cap of 900. That Equation numeric file is outside this milestone.
- `npx tsc -b --pretty false` and `npm run build` currently fail in untracked `src/lib/modes/equation/numeric-card-credibility-polish.test.ts`, where the test accesses `DisplayOutcome.detailSections` without narrowing away prompt outcomes and has implicit-any callback parameters. This file is outside `SETTINGS-HISTORY-VISUAL-FIDELITY1` and is not staged for this commit.

Visual QA:

- Ran local Vite preview at `http://127.0.0.1:5174/`.
- Captured desktop, wide desktop, and narrow Settings/History screenshots under `.task_tmp/SETTINGS-HISTORY-VISUAL-FIDELITY1/`.
- Seeded local browser History state only for screenshot density; no app code or runtime behavior depends on the seed.
- Fixed the History date filter after screenshot review showed the native select styling made the selected time range hard to read.
- Rechecked wide History after user feedback; History now uses the full available app-stage width and the ledger expands into the extra space.

## Coverage Notes

- Settings tests prove the mock taxonomy nav renders, category switching works, existing settings patches are still used, and derived preview/impact values reflect supplied settings.
- History tests prove table headers, timeline/filter behavior, no Export button, virtualized rows, selected-result inspector actions, single-click selection, double-click replay, Shift range selection, Ctrl/Cmd toggled selection, and pending stop controls.
- Existing tab/page tests still prove tabs remain outside `.calculator-shell`, page surfaces remain outside the calculator shell, and History replay/Auto Equation routing land correctly on first click.
