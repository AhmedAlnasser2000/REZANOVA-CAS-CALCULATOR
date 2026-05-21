# PGL-VIS1-POLISH Labs Preview Completion Report

## Attribution
- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live

## Goal
- Polish the interactive Labs console so Labs mode owns a meaningful top-display preview and comparison tables render math instead of raw LaTeX.

## Completed Work
- Added `src/app/runtime/useLabsRuntime.ts` to share Labs runner UI state between `LabsPanel` and `DisplayPanel`.
- Wired `AppMain` so one Labs runtime instance feeds both the top display and the Labs control panel.
- Updated `DisplayPanel` with a Labs-specific branch that shows developer-only runner/input/result preview and suppresses stale normal calculator outcomes while in Labs.
- Updated `LabsPanel` comparison rows to render input math with `MathStatic` while retaining raw LaTeX in inert details/accessibility surfaces.
- Kept Labs runner execution gated by `VITE_SHOW_LABS=1` and `VITE_ENABLE_LAB_RUNNERS=1`.

## Boundaries Preserved
- No product math behavior changed.
- No normal history/provenance integration was added.
- No release-build runner execution was added.
- No remote compute, SSH controls, FriCAS execution, or source-mirror execution was added.
- Stable runtime Labs code still does not import or dynamically load `playground/`.

## Files Of Interest
- `src/app/runtime/useLabsRuntime.ts`
- `src/app/shell/DisplayPanel.tsx`
- `src/components/LabsPanel.tsx`
- `src/components/LabsPanel.ui.test.tsx`
- `src/AppMain.tsx`
- `src/AppMain.ui.test.tsx`
- `.memory/research/checklists/2026-05/TRACK-PGL-VIS1-POLISH-MANUAL-VERIFICATION-CHECKLIST.md`
