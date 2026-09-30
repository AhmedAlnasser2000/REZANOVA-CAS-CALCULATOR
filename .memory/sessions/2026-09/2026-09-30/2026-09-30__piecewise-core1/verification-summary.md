# PIECEWISE-CORE1 verification

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

- `tsc -b` clean, `npm run build` passes, scoped ESLint 0 errors (2 existing controller warnings), file sizes within caps, `test:bundle-size` passes, `test:graph-gpu` 60/60 with the graphing boundary ratchet (95 files), memory protocol passes.
- **Gate 1:** `condition-intervals.test.ts` 7/7 (x²<2 vs x²≤2 at exactly ±√2, a 0.001-wide branch at a ±1000 view, the 1/x pole excluded, ≠, or, equality points, double roots, sliders, first-match partition, shadowed/offscreen/impossible statuses); old partition tests 5/5; parser tests 52/52 and 49/49 with the new forms.
- **Gate 2:** `piecewise.test.ts` 5/5 (exact end circles and path ends, first match, narrow branch, restriction and hole, polar branches); `request.test.ts` 25/25 including a polar piecewise result that validates.
- **Gate 3:** `piecewise-analysis.test.ts` 3/3 (continuous, jump and removable boundaries; exact branch root and no fake extrema at a step; intersections with a line); PTX 13/13.
- **Suites:** graph and app graphing 324/324; graph UI 40/40; golden passes except the New Integration floor owned by Codex.
- **Gate 4, Playwright Chromium:** new `graphing-piecewise` 4/4 (jump circles and a sweep across branches with verified, endpoint and hole readouts; restriction braces and a hole with its limit; polar branches, the shadowed-branch and polar-letter messages; points of interest on a piecewise curve). Graph specs: 55 passed; failures are the pre-existing piecewise keyboard-focus test, the performance spec (fails on clean HEAD too) and once the Three viewport test, which passes 3/3 on its own.
- **Visual:** screenshots of the jump (hollow ring in the curve's colour, filled end with `Endpoint (1, 3)`) and of the hole readout inspected.
- **Desktop (packaged WebKitGTK):** `test:desktop-smoke` passes after a debug rebuild, with a new piecewise step (one open and one filled circle, two paths).
