# ASYMPTOTE-FIX1 verification

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

- `tsc -b` clean, lint 0 errors (one existing controller warning), graph and app graphing tests 334/334, graph UI 41/41, file sizes and bundle size pass, graphing boundary ratchet passes (97 files).
- **Unit:** tan, sec and 1/cos give the six poles ±π/2, ±3π/2, ±5π/2 in [−10, 10]; cot gives seven; tan 3x twenty; sin x none; sin(x)/x one hole and no pole; floor only jumps. `asymptoteLabelNumber`: π/2, −3π/2, π, −π/6, 0, 1, −2.5.
- **Playwright Chromium:** new PTX2 test (tan lines `x = −3π/2 … 3π/2` on selection); PTX, PTX2, piecewise and FIX2 specs 17/17. Screenshots inspected: eight labelled lines, root dots on the axis, the right-most label kept inside the pane.
- **Desktop (packaged WebKitGTK):** `test:desktop-smoke` passes after a debug rebuild with a new tan step (eight lines `x = −7π/2 … 7π/2`); all screenshots taken this time.
