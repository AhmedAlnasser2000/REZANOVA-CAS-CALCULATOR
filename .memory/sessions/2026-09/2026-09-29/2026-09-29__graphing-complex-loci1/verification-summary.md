# GRAPHING-COMPLEX-LOCI1 verification

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

## Evidence (2026-09-29)

- `tsc -b` clean, `npm run build` passes, and scoped ESLint shows 0 errors (the 2 existing controller warnings remain).
- File sizes are within caps. `test:bundle-size` exits 0, and the root solver and complex plan are not in the startup entry.
- **Unit suites:**
  - `test:graph-contracts` 16/16
  - `test:graph-parser` 52/52, with new locus, root, surface and rejection cases
  - `test:graph-sampling` 95/95, with complex-plan parity (19), roots (8), locus geometry, and the log₁₀ and odd-root overlay cases
  - `test:graph-scene` 11/11, `test:graph-ooe` 53/53, `test:graph-gpu` 52/52
  - `src/app/graphing/*.test.ts` 30/30, with the new Re/Im trace hit-testing case
  - Graph UI tests 37/37
- **Playwright Chromium:**
  - new `e2e/graphing-complex-loci.spec.ts` 3/3: loci and exact roots with a hover readout, the ℂ trace "Complex part" label, and 30 2D/3D switches with 3D still drawing;
  - all graph specs 38 passed, the only failure being the pre-existing `graphing-minimum-visible.spec.ts:599`.
- **Visual:** screenshots inspected of three loci plus five exact roots on the Argand plane, and of the desktop locus.
- **Desktop:** packaged WebKitGTK `test:desktop-smoke` exits 0, with a new locus step (Complex opened, "1 locus", screenshot inspected).
- **Not run:** the WebKit Playwright project, because `libavif16 libwoff1` are still missing.
