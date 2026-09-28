# GRAPHING-CONSISTENCY1 verification

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

## Evidence (2026-09-28)

- **Types and lint:** `tsc -b` clean; `npm run build` passes; scoped ESLint on all changed files shows 0 errors (the 2 existing controller warnings remain).
- **Size and bundle:** file sizes within caps; `test:bundle-size` exit 0, and the heat shader sits only in the lazy GPU chunk, not the startup entry.
- **Unit suites:**
  - `test:graph-contracts` 16/16, `test:graph-parser` 34/34 (7 new z-mix cases), `test:graph-sampling` 67/67 (new opt-in complex values case, including per-path buffer ownership), `test:graph-scene` 11/11, `test:graph-ooe` 52/52, `test:graph-gpu` 52/52 (new heat-map case).
  - `src/app/graphing/*.test.ts` 29/29 (new auto-switch/toggle file, Style-tab migration for v7 and v6).
- **Graph UI tests:** 37/37.
- **Playwright Chromium:**
  - New `e2e/graphing-consistency.spec.ts` 4/4.
  - The complex-delete case was proven to fail without the fix (centre saturation 179 vs < 20).
  - minimum-visible 24/25, complex/real-fields/surfaces/sampler/parity specs pass.
  - The only failure is the pre-existing `graphing-minimum-visible.spec.ts:599` piecewise keyboard focus (open question from Move 30).
  - `:88` now uses an exact 'Complex' button locator, because the ℂ toggles also contain "complex".
- **Visual (Playwright screenshots, inspected):**
  - `sqrt(-x)` with Re/Im and legend;
  - z auto-switch with notice and highlight;
  - Analyze without Style or Complex solve;
  - the ripple `sin(r)/r` heat map at default and zoomed-out views on the RTX (ANGLE Vulkan) and on SwiftShader;
  - the placeholder text and the row scrolled to its start.
- **Packaged desktop (WebKitGTK 2.52.6, standalone debug build):** `test:desktop-smoke` exit 0 with the new 2D surface height-map step (GPU chip, 0 visible SVG bands, screenshot inspected).
- **Not run:** the WebKit Playwright project (host still lacks `libavif16 libwoff1`).
