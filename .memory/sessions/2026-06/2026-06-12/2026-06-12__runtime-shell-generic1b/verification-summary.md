# RUNTIME-SHELL-GENERIC1b Verification Summary

Date: 2026-06-12
Agent: claude-code
Model: claude-fable-5

## Result

`RUNTIME-SHELL-GENERIC1b` migrated Statistics onto the shared `launchWorkspaceRuntimeJob` helper.

## What Changed

- `runStatisticsAction` in `src/AppMain.tsx` now uses the helper config; ~63 inline wiring lines replaced by ~30.
- The Statistics-only pre-commit working-source update (`setStatisticsWorkingSource` from `replaySeed` when still visible) is preserved inside the commit callback at its original position before `commitOutcome`.

## Boundaries

- Worker host, capability ID (`statistics.evaluate`), pilot, and OOE lib untouched; dynamic import stays in AppMain for bundle splitting.
- No solver, history-schema, status-text, or display behavior changed.

## Verification

- `tsc -b` passed.
- `npm run test:unit` passed (185 files, 1,557 tests), no test modifications.
- `npm run test:ui` passed (12 files, 162 tests), no test modifications.
- `npm run lint` and `npm run test:file-sizes` passed.
