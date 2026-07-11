# PRINT-PROFILE-CALCULUS1 Gate

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.6
- primary_agent_family: sol
- contributors:
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.6
- recorded_by_agent_family: sol
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.6
- verified_by_agent_family: sol
- attribution_basis: live

## Gate

- Kind: `backend` producer-profile migration with `ui` Chromium evidence.
- Result: pass.
- Runtime behavior changed: all 43 Calculus result producers explicitly enter `pedagogical-v1`; the full Calculus replay file now hard-compares normalized LaTeX. Canonical strings and visible behavior are unchanged.

## Contract Evidence

- All 43 Calculus compatibility paths use `profileCalculusResult()` at their authored result objects across derivative, integral, limit, Laplace, ODE, and series families.
- Calculus is zero compatibility, 43 migrated, and 29 forwarded. The global floor falls from 110 to 67.
- Explicit existing result annotations preserve TypeScript union narrowing at wrapped integral helpers without changing runtime shape.
- All 25 Calculus fixtures hard-compare normalized LaTeX, bringing hard coverage to 70/100.
- The output ledger records no accepted visible drift.

## Verification Evidence

- Calculus-focused coverage passed 31 files and 244 tests; the two affected integral suites passed 48 tests after the type annotation fix.
- Printer ratchet: seven tests; 519 paths, 67 compatibility, 209 migrated, and 240 forwarded.
- Golden: 44; print hygiene: seven over 43 executions and 203 fragments; all 100 replay fixtures passed with zero hard or report-only difference.
- Feature probes passed 124 unit and 37 UI tests.
- All 11 Chromium Calculus smoke flows passed. Fresh Laplace and ODE screenshots show complete exact math and readable details without clipping, overlap, or fallback leakage.
- TypeScript, production build, lint, file size, Surface Protocol, OOE, compartments, seam selection, memory protocol, and diff hygiene passed.

## Remaining Boundary

- Guided domains retain 20 owned compatibility producers across Trigonometry, Geometry, and Statistics. Table already has zero compatibility but still needs explicit profile and hard replay evidence.
- No visible output, solver, capability, History storage, OOE, worker, Surface Protocol, Statistics guided-control, or Matrix/Vector capability change is included.
