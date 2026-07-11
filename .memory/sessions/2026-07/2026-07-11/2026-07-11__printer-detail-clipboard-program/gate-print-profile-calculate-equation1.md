# PRINT-PROFILE-CALCULATE-EQUATION1 Gate

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

- Kind: `backend` producer-profile migration with `ui` browser evidence.
- Result: pass.
- Runtime behavior changed: proven Calculate and Equation finite-root producers explicitly enter `pedagogical-v1`; normalized Calculate replay LaTeX is now a hard expectation. Mathematical behavior and visible output are unchanged.

## Contract Evidence

- Calculate compatibility debt falls from two to zero. The printer inventory is 519 result paths, 255 compatibility fallbacks, 21 migrated dual writes, and 240 forwarders.
- The two numeric result paths carry finite numeric answer nodes. Calculate and Equation finite-root payloads preserve `canonicalMath.canonicalLatex === exactLatex` and structured-clone safety.
- Equation finite roots use the established presentation IR as their domain adapter; generic MathJSON scaffolding cannot leak `0+a` or `1\sqrt{b}` into output.
- Twenty Calculate replay fixtures hard-compare normalized LaTeX. The remaining 80 fixtures retain report-only policy until their named profile slices.
- No visible output change was accepted. Three less-readable generic candidates are recorded as rejected in the output ledger.

## Verification Evidence

- Focused printer, numeric, Calculate, Equation finite-root, golden, print-hygiene, and History replay: nine files and 95 tests passed.
- Feature probes passed 124 unit and 37 UI tests. The 43-case golden corpus, 203-fragment print-hygiene baseline, and all 100 replay fixtures passed with zero drift.
- Five Calculate/Equation Chromium canaries passed from a fresh production build.
- TypeScript, build, lint, file size, printer migration, seam selection, Surface Protocol, OOE, compartments, memory protocol, and diff hygiene passed.

## Remaining Boundary

- Equation advanced retains 76 owned compatibility producers and remains the next slice.
- No Statistics guided-control, Matrix/Vector capability, structured History, Display inversion, worker, OOE, or Surface Protocol expansion is included.
