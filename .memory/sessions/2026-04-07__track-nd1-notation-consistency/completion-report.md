# ND1 Completion Report

- Gate: `ui`
- Status: verified, not committed

## Delivered
- Added persisted `mathNotationDisplay` support with `Rendered`, `Plain Text`, and `LaTeX` modes.
- Introduced a shared notation-aware read-only math presentation path so result cards, periodic-family sections, and guide/history surfaces follow the same display preference.
- Split result actions so `Copy Result` follows the visible notation while `To Editor` always inserts canonical LaTeX.
- Kept `EXACT / DECIMAL / BOTH` as the separate output-style control and preserved synchronization between Settings and the top-row shortcut.

## Main Files
- `src/types/calculator/runtime-types.ts`
- `src/lib/schemas.ts`
- `src-tauri/src/lib.rs`
- `src/AppMain.tsx`
- `src/components/MathStatic.tsx`
- `src/components/SettingsPanel.tsx`
- `src/components/MathNotationContext.tsx`
- `src/components/NotationText.tsx`
- `src/lib/math-notation.ts`
- `src/lib/math-notation-context.ts`
- `src/lib/math-notation.test.ts`
- `src/AppMain.ui.test.tsx`
- `e2e/qa1-smoke.spec.ts`

## Notes
- Raw LaTeX leakage in human-readable result details is treated as a bug and is now removed in `Rendered` and `Plain Text` modes.
- Internal storage and editor-loading behavior still use canonical LaTeX; ND1 changes display/copy consistency, not solver breadth.
