# GRAPHING-POLAR-GRID1 verification summary

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

## Passing focused evidence

- Graph contracts: 13/13; evaluator/sampling: 31/31; Graph OOE/adjacent registries: 35/35; parser/hit testing: 25/25; focused Graph UI: 14/14.
- Incremental TypeScript and Vite production build passed. Graph remains a separate lazy chunk at about 115.17 kB raw and 35.77 kB gzip.
- Production Playwright passed polar/parametric/domain/grid/overlay/tracing behavior and required layouts at 1180x760, 1280x800, 1440x940, and 1920x1080 with one worker.
- Graph MathLive selection contrast passed a focused production-browser assertion and visual inspection at 1440x940.
- The throttled 25-row/10-visible checkpoint passed: p95 frame interval 16.70 ms, maximum observed long task 0 ms, editor feedback 47.90 ms, first preview 46.20 ms, settled scene 118.70 ms, and zero stale commits.
- The 20-cycle lifecycle soak passed with zero retained jobs, animation frames, listeners, renderers, or buffers; warmed heap was 72,605,904 bytes, final heap 69,643,140 bytes, and measured growth zero.
- Graph/OOE/compartment boundaries pass. Three.js dependency/import scan is empty.
- `npm run tauri:build` completed before the user narrowed further package work, producing the configured Linux artifacts; no package was installed.

## Recorded checkpoint blockers

- `npm run test:bundle-size` fails the pre-existing eager-main ratchet: 7,173.26 kB raw versus 2,148.44 kB, 2,000.14 kB gzip versus 732.42 kB, and a 3,332.04 kB largest app chunk versus 878.91 kB. Passing requires a separately approved app-shell/bootstrap lazy-boundary change; no cap was raised.
- Packaged-GUI visual inspection is not verified. Launching from the Snap-hosted VS Code environment failed in `/snap/core20/.../libpthread.so.0` at `__libc_pthread_init` because Snap GTK/glibc paths contaminated the native process. Production browser visuals are verified; packaged visual risk remains open.

## Visual evidence

- `test-results/move14-visual/.../graphing-polar-grid-1440x940.png`: polar grid, explicit grid panel, polar/parametric curves, Unit Circle, and theta trace are readable without overflow.
- `test-results/move14-visual/.../graphing-checkpoint-1180x760.png` through `1920x1080.png`: required layout coverage.
- `test-results/move14-selection/.../graphing-mathlive-selection-1440x940.png`: nested group remains legible against the dark editor.

## Scope integrity

- `GraphRelationIR` remains downstream mathematical authority; MathLive/LaTeX remains authoring source and provenance only.
- No Three.js, Analyze, analysis OOE, Complex/Both, Export, Presentation, History, Notebook, Surface Protocol, calculator Variables, solver, result-contract, or OOE diagnostics UI change was introduced.
