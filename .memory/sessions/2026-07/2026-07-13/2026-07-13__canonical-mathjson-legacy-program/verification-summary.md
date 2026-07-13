# Canonical MathJSON And Legacy Removal Verification Summary

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

## PROVEN-ANSWER-MATHJSON-CONTRACT1

- kind: backend result-contract proof boundary
- result: pass
- runtime behavior changed: no
- intentional mathematical or visible output change: no
- visual verification: not required for this pure backend contract gate
- push: not authorized

## Evidence

- Focused proof contract: 5 tests pass.
- Result contract: 11 files and 47 tests pass across all 43 golden and 100 replay executions.
- MathJSON coverage: accepted 100-probe baseline remains 262 leaves, 26 proven, 236 missing, and zero exempt.
- Printer contract: 5 files and 26 tests pass; seam selector: 14 tests; compartment boundaries: 36 tests.
- TypeScript, global lint, production build with 2,966 modules, file-size ratchet over 1,767 files and 7 caps, and diff hygiene pass.
- Concurrent Notebook files and untracked `test-results/` were not staged or modified by this gate.

## CANONICAL-PRODUCER-MATH-VALUE1

- kind: backend workspace producer-boundary contract
- result: pass for milestone-owned scope
- runtime behavior changed: no producer currently supplies the new direct-value option
- intentional mathematical or visible output change: no
- visual verification: not required for this inactive backend contract gate
- focused result contract: 12 files and 53 tests pass, including direct-value coverage for all nine workspace owners.
- corpus evidence: all 43 golden and 100 replay executions pass; the accepted coverage baseline remains 262 leaves, 26 proven, 236 missing, and zero exempt.
- runtime/static evidence: 76 runtime-contract tests, History replay, 20 inversion tests, 26 printer tests, 14 seam tests, 36 compartment tests, TypeScript, global lint, 2,966-module build, and diff hygiene pass.
- inversion repair: the registry reporter's audit-only `kind` read is now classified; consumer count is 595 with compatibility, legacy, and native floors unchanged.
- shared file-size blocker: live validation fails only because concurrent `src/AppMain.tsx` is 3,312 lines against its 3,306 cap. A non-writing scoped validation of all 1,768 files passes when that single foreign edit is excluded.

## MATHJSON-COVERAGE-CALCULATE-EQUATION1

- kind: backend producer coverage with app-visible parity verification
- result: pass for milestone-owned scope
- coverage: 100 fixtures, 262 leaves, 89 proven, four bounded mixed prose/math exemptions, 169 missing, 55,009 current serialized bytes under the 55,053-byte accepted cap, and a 2,753-byte maximum document
- regression: 180 Equation/algebra/engine files and 1,506 tests pass after repairing 13 initially exposed compatibility regressions
- authority: Equation remains at 134 native documents, zero compatibility projections, and 265 registered legacy reads; the repository keeps one known History compatibility projection
- visual: isolated Chromium confirms established complex `i` output, DEG periodic family structure, radical range-guard evidence, and no horizontal overflow
- static: result contract, printer, seam, OOE, compartments, TypeScript, production build, file size, and diff hygiene pass
- shared blocker: global lint is blocked only by concurrent Notebook `src/app/shell/notebook/canvas/extensions.tsx` at `react-refresh/only-export-components`

## MATHJSON-COVERAGE-SYMBOLIC-CALCULUS1

- kind: backend producer coverage with app-visible parity verification
- result: pass
- coverage: all 80 Calculus replay leaves are classified; 64 carry proven MathJSON and 16 are bounded exact exemptions. Global coverage is 262 leaves, 149 proven, 20 exempt, and 93 missing, with 57,642 serialized bytes and a 2,753-byte maximum document.
- producer evidence: differentiated ASTs, integral and limit route values, series terms, Laplace table structures, ODE/IVP values, implicit-derivative carrier trees, and stored-value snapshots reach the final Calculus adapter without reparsing formatted output.
- payload: 25 Calculus documents total 19,673 bytes. Three runs of five cold and 50 warm structured-clone corpus passes record warm P95 of 0.175-0.181 ms per pass, approximately 0.007 ms per document; committed bounds are unchanged.
- regression: 156 Calculus/Symbolic files and 1,022 tests pass. MathJSON coverage, result contract, Equation solve-result, History replay, all 43 golden executions, print hygiene, feature probes, printer migration, display inversion, seam selection, OOE, and compartment gates pass.
- baselines: 38 replay fixtures and seven print-hygiene golden entries changed only by canonical-MathJSON proof-presence markers. Identity, cardinalities, canonical LaTeX, visible formatting, and mathematics are unchanged.
- static: TypeScript, global lint, 2,973-module production build, file-size ratchet over 1,775 files and seven caps, and diff hygiene pass.
- visual: the 11-test Calculus Chromium smoke passes. Seven inspected 1440px cards cover derivative, implicit derivative, indefinite integral, one-sided limit, Maclaurin, Laplace, and numeric IVP; all render expected answers/details with zero card or page horizontal overflow.
- residual: Laplace's existing table detail exposes raw-looking `Le^(()a t) = 1/(s-a)` text. It predates this no-output-drift milestone and is recorded separately for presentation review.
