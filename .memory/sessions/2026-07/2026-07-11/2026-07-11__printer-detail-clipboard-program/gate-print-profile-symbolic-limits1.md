# PRINT-PROFILE-SYMBOLIC-LIMITS1 Gate

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
- Runtime behavior changed: every proof-aware Symbolic Limits result producer explicitly enters `pedagogical-v1`; five migrated replay fixtures now hard-compare normalized LaTeX. Canonical strings and visible behavior are unchanged.

## Contract Evidence

- All 35 Symbolic Limits compatibility paths are wrapped at their authored result objects by `profileSymbolicLimitsResult()`.
- Symbolic Limits now has zero compatibility, 35 migrated, and 22 forwarded result paths. The global printer floor falls from 179 to 144.
- Exact conclusions, infinity signs, conditional cases, method readback, routing, and fallback behavior remain stable through the native Limits adapter.
- Five Calculus limit fixtures hard-compare normalized LaTeX, bringing hard coverage to 50/100 while unrelated Calculus families remain report-only.
- The output ledger records no accepted visible drift.

## Verification Evidence

- Focused Limits, Calculus Limits, printer-profile, golden, print-hygiene, and replay coverage passed 22 files and 182 tests.
- Printer ratchet: seven tests; 519 paths, 144 compatibility, 132 migrated, and 240 forwarded.
- Golden: 44; print hygiene: seven over 43 executions and 203 fragments; all 100 replay fixtures passed with zero hard or report-only difference.
- Feature probes passed 124 unit and 37 UI tests. The real Chromium advanced-Calculus smoke exercised integral and multiple Limits routes from a fresh production build without visible drift.
- TypeScript, production build, lint, file size, Surface Protocol, OOE, compartments, seam selection, memory protocol, and diff hygiene passed.

## Remaining Boundary

- Symbolic Integration retains 34 owned compatibility producers and is next.
- No visible output, solver, capability, History storage, OOE, worker, Surface Protocol, Statistics guided-control, or Matrix/Vector capability change is included.
