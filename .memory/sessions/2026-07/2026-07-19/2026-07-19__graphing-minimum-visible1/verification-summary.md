# GRAPHING-MINIMUM-VISIBLE1 verification summary

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.6
- primary_agent_family: sol
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.6
- recorded_by_agent_family: sol
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.6
- verified_by_agent_family: sol
- attribution_basis: live
- gate_type: ui
- date: 2026-07-19

## Focused evidence

- Focused Graph/shell UI Vitest passed 31/31 cases with one worker before the screencast correction. The final affected Graph page/viewport delta then passed 7/7 with one worker. Coverage includes launcher exposure, lazy active-surface routing, one trailing blank row, source-to-IR authority, stale-geometry grace, visibility/delete/undo, independent controls, twenty pointer moves causing zero viewport commits until pointer release, wheel events 120ms apart coalescing into one commit after the 180ms settlement, and rail collapse producing no sampling work.
- Focused Graph document and OOE Vitest passed 10/10 cases with one worker. A palette correction then passed its affected Graph page file 4/4 plus incremental TypeScript without repeating unaffected broad evidence.
- Production Playwright initially passed three focused scenarios with one worker. After the user screencast correction, the rebuilt production artifact passed 4/4 in one-worker Playwright: first-character focus preservation, 1280x800 bare expression/discontinuity/truthful-control coverage, 1600x940 selection-free compositor pan/zoom/rail/independent-tab coverage, and reduced-motion/incomplete-source grace.
- Visual inspection of the real production screenshot at `test-results/graphing-minimum-visible-G-85523-he-visible-surface-truthful-chromium/graphing-1280x800.png` confirms the approved dark hierarchy, readable rail/canvas/footer, matching blue/green/violet row and curve colors, unclipped axes, and no visible overflow or inert future control.
- Incremental TypeScript, targeted ESLint, production builds, and diff hygiene passed. The final production manifest emitted Graphing as a separate `GraphWorkspacePage` chunk of about 59.84 kB minified and 20.64 kB gzip. Package/import inspection confirms no Three.js dependency or import; only the predeclared renderer contract identifier exists.
- The final Graph workspace seam delta passed 28/28 backend and 28/28 UI cases with one worker, while the Graph production boundary passed all 7 tests and validated 37 files. Seam-impact selection passed 21/21.
- No full unit or UI suite was run. All focused Vitest and Playwright invocations used one worker and ran sequentially; production builds were announced and ran without overlapping heavy jobs. No Vite, Vitest, Playwright, TypeScript build, or benchmark process remained after evidence collection.
- The post-build rail-dependency correction changes only sampling scheduling for presentation-only rail state. It passed its affected 5/5 Graph page UI file plus incremental TypeScript; unaffected production visual, focus, pan/zoom, and reduced-motion evidence was not repeated.

## Scope integrity

- Plotting consumes structured explicit-y relation IR only. MathLive/LaTeX remains source and provenance, never downstream graphing authority.
- Move 8 does not implement explicit-x/points, implicit regions, piecewise, parameters, polar/parametric, adaptive polar grids, Analyze, Complex/Both, Export, Presentation, Three.js, History, Notebook, Surface Protocol, calculator Variables, solver precedence, result contracts, or OOE diagnostics UI.
