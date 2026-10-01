# PTX3 verification

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

## Evidence (2026-10-01)

- `tsc -b`: no errors in graphing or app code (the only errors are in Codex's uncommitted `src/lib/symbolic-engine/**` files). Scoped ESLint 0 errors (one existing controller warning). File sizes within caps (`analyze.ts` 624 lines), `test:bundle-size` passes, graph contracts/parser/sampling/scene/ooe/gpu suites pass with the boundary ratchet, memory protocol passes.
- **Unit:** graph and app graphing 346/346, including `curve-features.test.ts` 7/7 (parametric and implicit circles: crossings and four turning points; x = y² vertex; restricted ends included or not; rose origin pass at θ = π/4 and no origin axis crossings; line × implicit circle, parametric × line, implicit × vertical line, parametric × parametric; open and closed region corners), `curve-analysis.test.ts` 3/3 (parametric, implicit, polar, chained region and x = f(y) piecewise evidence, intersections across kinds, no "unsupported" findings, results validate), `ptx-region-trace.test.ts` 2/2 and the region edge readout in `ptx-real-trace.test.ts`. Graph UI 41/41.
- **Playwright Chromium (vite build):** new `graphing-ptx3` 5/5 (parametric Highest/Leftmost and polar Origin readouts; implicit y-intercept and a cross-kind intersection; region inside ✓, hidden outside, open corner `Corner (2, 2) · not included`, edge `included`; piecewise root and intersection; trajectory `z = … · t = …` with t ≡ 0.5 mod 2π). All graph specs except performance: 67/67 after updating the region-edge readout expectation in `graphing-minimum-visible`.
- **Visual:** screenshots inspected: parametric circle dots with `x-intercept (-1, 0) · t = …`; region with an open corner ring at (2, 2), edge-axis dots, dashed strict edge.
- **Desktop (packaged WebKitGTK):** `test:desktop-smoke` passes after a debug rebuild (pre-build overridden to `npx vite build`) with a new step: a traced parametric circle shows 8 dots and the region `x<y≤2` one open corner; all earlier steps pass; screenshots taken.
