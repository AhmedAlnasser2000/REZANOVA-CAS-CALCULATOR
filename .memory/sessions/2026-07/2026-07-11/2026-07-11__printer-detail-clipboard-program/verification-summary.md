# Printer, Clipboard, And Detail Program Verification Summary

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

## Current Verified Gate

- `PRINT-PROFILE-CALCULUS1`: all 43 Calculus engine/workspace producers enter `pedagogical-v1` through the explicit Calculus domain adapter. Derivative, integral, limit, Laplace, ODE, and series serialization remains native and unchanged.
- The printer ratchet inventories 519 result paths: 67 compatibility fallbacks, 209 migrated paths, and 240 forwarders. Calculus is zero compatibility, 43 migrated, and 29 forwarded.
- The full 25-fixture Calculus file now hard-compares normalized LaTeX, bringing hard coverage to 70/100.
- Calculus-focused coverage passed 31 files and 244 tests. Golden passed 44, print hygiene passed seven over 43 executions and 203 fragments, all 100 replay fixtures passed, and feature probes passed 124 unit plus 37 UI tests.
- All 11 Chromium Calculus smoke flows passed. Fresh Laplace `2/(s^2+4)` and first-order ODE cards were inspected with complete exact math, readable details, and no clipping, overlap, fallback leakage, or visible drift.
- Explicit return annotations preserve the existing Calculus result-union narrowing around wrapped integral helpers; TypeScript and the affected 48 integral tests pass.
- TypeScript, production build, lint, file size, printer migration, seam selection, Surface Protocol, OOE, compartments, and diff hygiene passed.
