# APPMAIN-SLIM5 Verification Summary

Date: 2026-06-12
Agent: claude-code
Model: claude-fable-5

## Result

`APPMAIN-SLIM5` extracted the calculator-memory autosave lifecycle into `src/app/runtime/useCalculatorMemoryPersistence.ts`, continuing the APPMAIN-SLIM grouped-hook series.

## What Changed

- New hook (192 lines) owns: ready/dirty/timer/lastSavedAt refs, `flush` with enable/dirty/throttle gates and size-bounded persist, settled-mode `scheduleSave` debounce, interval-mode effect, beforeunload/unmount flush effect, `markDirty`, `restoreFromSnapshot`, `cancelScheduledSave`, `noteMemoryCleared`.
- AppMain keeps `buildCalculatorMemorySnapshot` / `restoreCalculatorMemorySnapshot` (they touch AppMain-owned state) and passes them as callbacks; the 112-dependency watcher effect body is now a single `markCalculatorMemoryDirty()` call; boot restore and reset controls call hook functions.
- Removed from AppMain: 3 autosave constants, 4 refs, 3 lifecycle functions, 2 effects (~130 lines net). `persistCalculatorMemorySnapshot` import moved to the hook.
- Ratcheted `tools/file-size-baseline.json`: `src/AppMain.tsx` cap 8,265 -> 8,027.

## Boundaries

- No persistence behavior changed: same gating, debounce delays, throttle, size bounding, restore semantics, and reset semantics.
- No solver, OOE, history-schema, or display behavior changed.
- Hook returns stable `useCallback` functions reading latest options via a ref (not `useEffectEvent`, which react-hooks rules forbid returning from a hook).

## Verification

- `tsc -b` passed; `npm run lint` passed.
- `npm run test:unit` passed (185 files, 1,557 tests), no test modifications.
- `npm run test:ui` passed (12 files, 162 tests), no test modifications, including "restores durable calculator memory but starts with a clean editor session" and the beforeunload-flush/reset-controls test.
- `npm run test:file-sizes` passed after baseline ratchet.
- `src/AppMain.tsx`: 7,770 -> 7,644 lines (7,871 -> 7,644 across the full de-monolith lane).
