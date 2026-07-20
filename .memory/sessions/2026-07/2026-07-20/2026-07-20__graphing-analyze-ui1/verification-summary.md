# GRAPHING-ANALYZE-UI1 verification summary

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

- Graph page UI: 23/23.
- Graph workspace runtime: 56/56 across unit and UI stages.
- Graph contracts: 13/13; Graph boundary ratchet: 8/8 over 61 production files.
- Graph OOE/compartment focused tests: 43/43 plus 52/52 Node boundary checks.
- Canonical Result V2 enforcement: 7/7; V2/MathJSON coverage: 12/12 with 147 executable cases and zero exemptions; display inversion: 24/24.
- Result-contract focused suite: 127/127, including all 47 golden executions and all 100 History replay fixtures.
- Incremental TypeScript and production build pass. Focused ESLint has zero errors and the two existing controller cleanup-ref warnings. File sizes pass 10/10.
- Focused Chromium Playwright passes 1/1 with no console errors.

## Visual evidence

- Chromium at 1440x940 verifies that opening Analyze leaves the Graph viewport bounds unchanged.
- Chromium at 760x800 verifies non-modal responsive clamping, resize behavior, Features/Evidence/Style access, preview and persistent markers, explicit Recenter, and readable overflow.
- Captured evidence: `.task_tmp/GRAPHING-ANALYZE-UI1/playwright-results/graphing-minimum-visible-G-0b7ab-nt-and-explicitly-navigated-chromium/graphing-move24-analyze-overlay-760x800.png`.

## Final hygiene

- The protected prior `test-results/graphing-minimum-visible-G-07137--gap-endpoints-consistently-chromium/` artifact remains present and excluded.
- Move 24 Playwright output remains verification-only and excluded from the commit.
