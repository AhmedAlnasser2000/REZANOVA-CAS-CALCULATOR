# RUNTIME-SHELL-GENERIC1c Verification Summary

Date: 2026-06-12
Agent: claude-code
Model: claude-fable-5

## Result

`RUNTIME-SHELL-GENERIC1c` migrated Geometry onto the shared `launchWorkspaceRuntimeJob` helper, completing `RUNTIME-SHELL-GENERIC1`.

## What Changed

- `runGeometryAction` in `src/AppMain.tsx` now uses the helper config; ~60 inline wiring lines replaced by ~26. The conditional `geometrySeed` spread is preserved in the Geometry commit callback.

## Boundaries

- Worker host, capability ID (`geometry.evaluate`), pilot, and OOE lib untouched; dynamic import stays in AppMain.
- Calculate (`createCalculateRuntimeController`) and Linear Algebra (`useLinearAlgebraRuntime`) intentionally left on their existing extracted forms.
- No solver, history-schema, status-text, or display behavior changed.

## Verification

- `tsc -b` passed.
- `npm run test:unit` passed (185 files, 1,557 tests), no test modifications.
- `npm run test:ui` passed (12 files, 162 tests), no test modifications.
- `npm run lint` and `npm run test:file-sizes` passed.
- `src/AppMain.tsx` across GENERIC1a-c: 7,871 -> 7,770 lines.
