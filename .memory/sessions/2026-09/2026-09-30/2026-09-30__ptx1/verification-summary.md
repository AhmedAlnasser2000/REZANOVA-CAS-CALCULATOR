# PTX1 verification

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

- `tsc -b` clean, `npm run build` passes, scoped ESLint 0 errors (2 existing controller warnings), file sizes within caps, `test:bundle-size` passes, graphing boundary ratchet 12/12 and 93 production files, memory protocol passes.
- **Unit:** PTX core 13/13 (projection to 1e-10 on circles and loci, no landing on the arg cut, touching roots, poles rejected, sin extrema within their error bounds, tangential and locus intersections, readouts, port swap); app PTX 9/9; graph suites 303/303; graph UI 40/40; golden passes except the New Integration coverage floor owned by Codex's lane.
- **Playwright Chromium:** new `graphing-ptx` 5/5 (locus click/sweep/step/clear; intersection snap only on arrival; pinned probe and Both-mode mirror; Real dots for x and x^2 with snap, Shift+Arrow and badges; no pull while approaching a limit of sin x / x). All graph specs 53 passed; failures are the pre-existing piecewise keyboard-focus test and the performance spec that also fails on a clean checkout.
- **Desktop (packaged WebKitGTK):** `test:desktop-smoke` passes after a debug rebuild.
- **Visual:** screenshots inspected of the Complex locus trace with badge and of the Real dots at (0,0) and (1,1).
