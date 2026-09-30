# GRAPHING-FIX2

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

## Authority and outcome

- Date: 2026-09-30. The user reported that changing a value in a piecewise condition disabled tracing everywhere until a restart, even after deleting the graphs, and asked for the small cleanup gate before PTX2A–2C. Plan decisions: a failed or dropped sample clears the stale picture; a restriction such as `x=y^2\{y>0\}` is a plain expression row; this gate is one commit, then PTX2 is one commit; no push. Root-only (DIRECT), on `main`; Codex's uncommitted work left unstaged.
- Outcome: **verified** (ui).

## Delivered

- **Tracing bug, root cause:** an item whose branches stayed invalid past the grace period was added to `suppressedPiecewiseItems`, the page passed `pending || suppressed.size > 0` to the Real pane (every trace path bails out while pending), and suppression was only released by Apply or discarding the draft. Now the Real pane's `pending` is the scene's own, and suppression lives in `usePiecewiseSuppression.ts` (moved out of the controller for its line cap): released when the branches become valid again, on Apply/discard, on delete (which also drops the draft), and pruned when undo/redo/reload removes the item.
- **Restriction rows:** `graphPiecewiseUsesBranchEditor` limits the branch editor to real `cases` items (two or more branches of y/x form); one-branch restrictions render and edit as ordinary expression rows.
- **Stale scenes:** a failed or non-superseded dropped sample clears the picture with a status that says nothing is drawn until it succeeds; a superseded sample still waits for the newer one.
- **Keyboard Add-item menu:** opening it from the keyboard focuses the first item; ArrowUp/Down (wrapping), Home, End and Escape (back to the opener) work (`graph-menu-keys.ts`). The minimum-visible test now expects Note first, then ArrowDown to Piecewise.
- **Performance spec, bisected:** editor feedback regressed at `90e41240` MATHFIELD-PLACEHOLDER1 (45–49 ms → 95 ms cold, 29 → 58 ms warm). Placeholder words became upright `\text{}`, so nothing warmed MathLive's math-mode typesetting (KaTeX_Math-Italic plus the Compute Engine dictionary MathLive builds for function names) before the first typed letter; the first edit paid for a font load, relayout and dictionary build. `warmMathLiveTypesetting()` (src/mathlive-runtime.ts, called from main.tsx) loads the math fonts and typesets one math string at idle: 44–50 ms again. First preview (183–211 ms against 150 ms) fails at `36d7a6d8` (Move 31, 196–259 ms) on this machine today, so it is environmental; budgets unchanged.
- **Vanish/duplicate report:** the stuck suppression explains "vanishes" (a hidden piecewise item stayed out of the scene after its text was valid again). A 40-step deterministic stress (piecewise invalid/valid edits, pans, wheel zooms, deletes, adds) now keeps every row drawn exactly once with no duplicate path ids; it is kept as a regression test. Duplicates were not reproduced.

## Deviations and findings

- The performance spec's first-preview budget stays failing on this machine at the last known-good commit too; recorded, not changed.
- Region (`≤`) traces had no PTX refiner and showed raw sampled vertices (e.g. `(3, 4.44089e-16)`); fixed in PTX2 (region boundaries refine as implicit curves).
