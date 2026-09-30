# GRAPHING-FIX2 verification

## Attribution

- primary_agent: claude
- primary_agent_model: claude-opus-5-5
- primary_agent_family: opus-5.5
- recorded_by_agent: claude
- recorded_by_agent_model: claude-opus-5-5
- recorded_by_agent_family: opus-5.5
- verified_by_agent: claude
- verified_by_agent_model: claude-opus-5-5
- verified_by_agent_family: opus-5.5
- attribution_basis: live

## Evidence (2026-09-30)

- `tsc -b` clean, `npm run build` passes, scoped ESLint 0 errors (one existing controller warning; the other left with the suppression timers), file sizes within caps (the controller at 975/1000 after extracting `usePiecewiseSuppression.ts`), `test:bundle-size` passes, memory protocol passes.
- **Unit and UI:** `mathlive-runtime.test.ts` 2/2 (fonts loaded, one idle typeset, never throws); graph UI 41/41 including the new stale-scene test (a failing sample clears the picture, the next success draws again).
- **Playwright Chromium:** new `graphing-fix2` 3/3: the user's sequence (an invalid piecewise condition past the grace period, fixed, then invalid and deleted) with tracing of another curve working at every step; a restriction row edited as text with its ring; the 40-step stress. The keyboard Add-item test passes (Note focused, ArrowDown to Piecewise).
- **Performance bisect:** throwaway worktrees at `36d7a6d8` (Move 31), `6e5f8679` and `90e41240`: editor feedback 45–46, 45–49 and 95 ms. Within `90e41240`, reverting single files and variants isolated `MathEditor`'s `\text{}` placeholders; a timeline trace showed a KaTeX_Math-Italic font load and 3× layout in the first edit, and a CPU profile showed the Compute Engine dictionary being built then. With `warmMathLiveTypesetting`: 50.7/29.0/29.6 ms in a three-load probe and 50.2, 47.1, 44.0 ms in the spec. First preview: 183–211 ms now; 196–259 ms at `36d7a6d8` on this machine.
- **Stress:** 40 deterministic steps (piecewise invalid→fixed and valid edits, pans, wheel zooms, deletes, adds): after every settle each row is drawn exactly once, with no duplicate path ids.
- **Desktop (packaged WebKitGTK):** `test:desktop-smoke` passes after a debug rebuild (see PTX2 for the new steps).
