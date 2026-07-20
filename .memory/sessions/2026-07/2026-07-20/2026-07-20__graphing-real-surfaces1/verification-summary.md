# GRAPHING-REAL-SURFACES1 verification summary

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
- gate_type: backend and ui
- date: 2026-07-20
- commit_hash: pending at write time

## Passing evidence

- Graph contracts: 13/13; parser: 26/26; sampling/evaluator: 53/53; scene/headless: 11/11.
- Graph OOE/compartment focused tests: 47/47 plus 52/52 Node boundary checks.
- Surface analysis/document/session: 19/19 after the explicit V5-to-V6 migration case; Graph page/SVG/Three UI: 36/36.
- Incremental TypeScript and production build pass. Canonical Result V2 enforcement passes 7/7, MathJSON/V2 coverage 12/12, display inversion 24/24, and the focused result-contract suite 127/127.
- File sizes pass 10/10; memory protocol passes 21/21; focused ESLint has zero errors and the two existing controller cleanup-ref warnings; diff hygiene passes.
- Focused Chromium Playwright passes 1/1 with no console errors.

## Visual evidence

- Chromium at 1440x940 verifies explicit `z=x^2+y^2`, top-down height coloring and contour overlay, the expanded surface-domain editor, the permanent dimension switch, and an automatically fitted shaded Three surface.
- Captured evidence: `.task_tmp/GRAPHING-REAL-SURFACES1/playwright-results-final/graphing-minimum-visible-G-61435-ecise-2D-and-interactive-3D-chromium/graphing-real-surface-2d-1440x940.png` and `graphing-real-surface-3d-1440x940.png` in the same directory.

## Final hygiene

- The protected prior `test-results/graphing-minimum-visible-G-07137--gap-endpoints-consistently-chromium/` artifact remains present and excluded.
- All Move 25 Playwright output remains verification-only under `.task_tmp/` and excluded from the commit.
