# GRAPHING-PERF1 verification

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

## Evidence (2026-10-06)

- `tsc -b` clean for graphing and app code (the only error is Codex's uncommitted display-types work in `historyDisplayEntry.ts`), scoped ESLint 0 errors, file sizes within caps (`useGraphWorkspaceController.ts` 994, `implicit.ts` 876, `analyze.ts` 665).
- **Unit:** graph-contracts 16, graph-sampling 128 (touching line one chain with no near-zero steps, isolated point as a point batch, touching circle one closed chain), graph-scene 11, graph-ooe 54, graph-gpu 60, graph-workspace-runtime 28+28, analysis 16 (focused items' own points only, intersections still with every curve), `graph-sample-queue` 4, graph UI 41; graphing boundary ratchet passes.
- **Pixel proof** (`e2e/graphing-perf1.spec.ts`, GPU on and off): blue pixels along y = x and a green filled dot at the origin, read from real screenshots; with GPU on, the CPU touching path hidden leaves no blue along the line (the GPU field paints nothing there). Checked to fail on the old shader rule (41/41 points painted).
- **Screenshots** (real Google Chrome, GPU chip "GPU"): `npm run dev` and the production build, both curves (`dev-chrome-*`, `prod-chrome-*` here); zoomed crops show a clean line where the old shader beaded it.
- **Performance spec** (4× CPU throttle on editor feedback and gestures, as the spec defines): before, bimodal ~200/320 ms or ~300/780 ms (preview/settled); after, 17 runs: first preview 84–151 ms, settled 205–272 ms; editor feedback 44.8–51.7 ms (two runs over 50 ms). Budgets unchanged.
- **Playwright Chromium (vite build):** every graph spec 80/80 after the final build; full suite 257 passed, 0 failed (before the final chain and shader edits, which the graph specs then reran).
- **Desktop (packaged WebKitGTK):** `test:desktop-smoke` passes after a debug rebuild; its touching-curve step now requires the `:touching:0` path to be painted (it was satisfied by any path before); every earlier step passes, no screenshots missing.
