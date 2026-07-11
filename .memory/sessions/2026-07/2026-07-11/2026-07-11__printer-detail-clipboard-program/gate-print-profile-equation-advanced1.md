# PRINT-PROFILE-EQUATION-ADVANCED1 Gate

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
- Runtime behavior changed: every advanced Equation result producer explicitly enters `pedagogical-v1`; Equation replay LaTeX is now hard evidence. Canonical strings and visible behavior are unchanged.

## Contract Evidence

- All 76 remaining Equation compatibility paths are wrapped at their authored object literals by `profileEquationResult()`.
- Equation now has zero compatibility, 86 migrated, and 97 forwarded result paths. The global printer floor falls from 255 to 179.
- The AST ratchet recognizes named profile wrappers only around the specific authored result object; it does not grant file-level exemptions.
- All 25 Equation fixtures hard-compare normalized LaTeX, bringing hard coverage to 45/100.
- The output ledger records no newly accepted or rejected drift because every advanced Equation serializer stayed byte-stable.

## Verification Evidence

- The broad Equation and Equation-mode suite passed across exact, numeric, parameterized, composition, target, Complex, numeric-region, worker, and boundary families.
- Printer ratchet: seven tests; 519 paths, 179 compatibility, 97 migrated, and 240 forwarded.
- Golden: 44; print hygiene: seven over 43 executions and 203 fragments; all 100 replay fixtures passed with zero hard or report-only difference.
- Feature probes passed 124 unit and 37 UI tests. Two Equation Chromium canaries passed from a fresh production build.
- TypeScript, build, lint, file size, Surface Protocol, OOE, compartments, seam selection, memory protocol, and diff hygiene passed.

## Remaining Boundary

- Symbolic Limits retains 35 owned compatibility producers and is next.
- No visible output, solver, capability, History storage, OOE, worker, Surface Protocol, Statistics guided-control, or Matrix/Vector capability change is included.
