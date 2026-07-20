# GRAPHING-THREE-RENDERER1 verification summary

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
- date: 2026-07-20
- commit_hash: pending at write time

## Passing evidence

- Incremental TypeScript passes.
- Graph camera/session/contract tests pass 15/15; the Graph boundary ratchet passes 8/8 and scans 52 production files.
- Focused Graph page/Three UI passes 26/26, including view-only persistence without mathematical resampling, adapter unavailability, projection/snaps/effects, gestures, selection, and disposal.
- Graph workspace runtime passes 56/56 across core and UI groups. The stale V1 rename assertion was corrected to the current content/mathematics revision contract.
- Production build passes. Bundle limits pass at 1982.33 kB eager raw and 536.61 kB eager gzip; the private Three adapter is a separate 539.40 kB raw/136.85 kB gzip dynamic entry and does not enter eager startup.
- Full ESLint passes with zero errors and the two pre-existing Graph controller cleanup warnings. File-size ratchet and diff hygiene pass.
- `npm audit --omit=dev` reports zero production dependency vulnerabilities.

## Browser and visual evidence

- Focused Chromium Playwright passes the private Three viewport scenario at 1440x940 with no console/page errors.
- It covers 2D/3D selection, actual WebGL2 canvas, Perspective/Orthographic, snaps, vertical exaggeration, wireframe, middle pan, Alt orbit, pointer zoom, keyboard reset, forced context loss, precise SVG continuity, restoration, disposal, and camera/projection persistence.
- Browser capture: `test-results/graphing-minimum-visible-G-ce858-ls-and-precise-SVG-recovery-chromium/graphing-move22-three-viewport-1440x940.png`.

## Final hygiene

- Memory protocol remains required after this dossier update.
- The protected prior `test-results/graphing-minimum-visible-G-07137--gap-endpoints-consistently-chromium/` artifact remains excluded.
- Playwright output and `.last-run.json` are verification-only and excluded from the commit.
