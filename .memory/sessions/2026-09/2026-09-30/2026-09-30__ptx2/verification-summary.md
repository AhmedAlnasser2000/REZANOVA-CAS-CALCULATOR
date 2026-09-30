# PTX2 verification

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

- `tsc -b` clean, `npm run build` passes, scoped ESLint 0 errors, file sizes within caps, `test:bundle-size` passes, graph contracts/parser/sampling/scene/ooe/gpu suites pass with the graphing boundary ratchet (97 files), memory protocol passes.
- **Unit:** graph and app graphing 334/334, including PTX: a point on (cos t, sin t) and on r = 2cos 2θ lands on the curve (1e-12); holes of (x²−1)/(x−1), floor steps, the jump of |x|/x and no circle for 1/x; exact asymptotes of x/(x−1) (x = 1, y = 1) and (x²+1)/x (x = 0, y = x), one-sided ln x at 0, numeric y = 1 for sin(x)/x + 1 and y = 0 for eˣ on one side; a region trace lands on its boundary and reads `(3, 0)`. Graph UI 41/41. Golden passes except the New Integration floor owned by Codex.
- **Playwright Chromium:** new `graphing-ptx2` 4/4 (parametric and polar readouts with verified badges; hole and floor-step readouts; z-map zero dot and pole ring readouts; asymptotes on selection, Off, Always, and Always with nothing selected). All graph specs except the performance spec: 61/61. Updated for intended behaviour: the polar readout format, the sin(x)/x sweep (now arriving at its hole ring), ℂ reached through "Show item options".
- **Visual:** screenshots inspected: rings at the hole and at floor steps with filled circles opposite, `Endpoint (2, 2)`; dashed `x = 1` / `y = 1` lines in the curve's colour with labels; the Display group (Asymptotes Auto/Always/Off, Complex values).
- **Desktop (packaged WebKitGTK):** `test:desktop-smoke` passes with new steps (the hole of (x²−1)/(x−1) is one open circle; x/(x−1) set to Always shows `x = 1` and `y = 1`) alongside the existing 3D, Complex, real-field, height-map, locus and piecewise checks. The desktop was locked, so WebKit painted no frames for screenshots; the probe now records missing screenshots (7) instead of hanging.
