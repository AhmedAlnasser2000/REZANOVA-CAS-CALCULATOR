# SX1.1 Completion Report

- Gate: `ui`
- Status: verified, not committed

## Delivered
- Replaced the in-shell `Settings` dock with a shared shell-level side-surface model for `Settings` and `History`.
- Added outboard right-rail presentation when the window has enough real spare gutter space.
- Kept overlay as the fallback when the window is too tight for the outboard rail.
- Preserved calculator-shell width while the outboard rail is open.

## Main Files
- `src/AppMain.tsx`
- `src/components/SettingsPanel.tsx`
- `src/components/HistoryPanel.tsx`
- `src/styles/app/shell.css`
- `src/AppMain.ui.test.tsx`
- `e2e/qa1-smoke.spec.ts`

## Notes
- The native desktop window is not resized automatically in this pass.
- Right side is the only shipped side; left-side support remains future-facing only.
