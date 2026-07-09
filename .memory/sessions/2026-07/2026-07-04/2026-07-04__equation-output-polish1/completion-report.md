# EQUATION-OUTPUT-POLISH1 Completion Report

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live

## Summary

- Added internal `systemReadback` for Equation Polynomial 2x2 results so the answer card can render clean solution-pair rows while preserving the existing exact LaTeX/copy contract.
- Routed display output style into the scheduled result blocks, renamed the top quick toggle to `Display Exact/Both/Decimal`, and made Decimal display show the approximate card instead of duplicating exact output when an approximation exists.
- Changed selected-target Complex intent fallback so unsupported guarded complex wrapper/preimage routes no longer mask validated real exact answers; the real answer is shown with a collapsed `Complex Extension Boundary` evidence card.
- Added exp/log approximate readback text for display-style toggles without changing exact symbolic payloads.

## Scope Notes

- Public `DisplayOutcome` remains the app display contract; the new structured row readback is internal display metadata for system answers.
- No new complex numerical-root frontier was implemented in this gate; complex capability expansion remains a separate planned discussion.
- The full `AppMain.ui.test.tsx` file still has broad failures outside the three targeted cases rerun for this slice; this gate used focused unit tests, targeted UI tests, TypeScript, file-size validation, and Playwright visual evidence.
