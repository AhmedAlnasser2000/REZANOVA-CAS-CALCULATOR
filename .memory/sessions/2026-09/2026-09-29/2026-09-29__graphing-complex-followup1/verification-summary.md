# GRAPHING-COMPLEX-FOLLOWUP1 verification

## Attribution

- primary_agent: claude
- primary_agent_model: claude-sonnet-5-5
- primary_agent_family: sonnet-5.5
- recorded_by_agent: claude
- recorded_by_agent_model: claude-sonnet-5-5
- recorded_by_agent_family: sonnet-5.5
- verified_by_agent: claude
- verified_by_agent_model: claude-sonnet-5-5
- verified_by_agent_family: sonnet-5.5
- attribution_basis: live

## Evidence (2026-09-29)

- `tsc -b` clean, `npm run build` passes, scoped ESLint clean, file sizes within caps, `test:bundle-size` and `test:ci-gate-alignment` pass, and the graphing boundary ratchet passes for 86 production files.
- **Unit suites:** `src/lib/graphing` plus `src/app/graphing` 285/285 (new: conjugate roots, equal-axes maths, GPU locus program and float32 parity of six locus sides against the CPU evaluator); `test:graph-gpu` 60/60; graph UI tests 40/40 (new: `useGraphEqualAxes`).
- **Playwright Chromium:** new `graphing-equal-axes` 2/2 (round in Real, Complex and Both after a resize; switch off stretches again), new `graphing-gpu-loci` 2/2 (circle, rays incl. arg = 3 rad with no false cut edge, disk; a locus far outside the CPU-sampled area drawn live mid-gesture; Both mode shows the GPU chip), extended `graphing-complex-loci` 4/4. Mutation checks: disabling the Complex-pane locus GPU makes the live-drawing test fail (edge pixels 12 against 80 needed).
- **All graph specs:** 48 passed; failures are the pre-existing piecewise keyboard-focus test and the performance spec, which also fails on a clean checkout of HEAD.
- **Desktop (packaged WebKitGTK):** `test:desktop-smoke` passes after a debug rebuild, with a new check that the locus circle is painted at four points (strength 170 each).
- **Visual:** screenshots inspected for the equal-axes Real and Both views and for the GPU locus in the Complex pane and in Both.
- **Not run:** the WebKit Playwright project (`libavif16 libwoff1` still missing).
