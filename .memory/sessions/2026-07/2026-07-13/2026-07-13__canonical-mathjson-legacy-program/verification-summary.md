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

## MATHJSON-COVERAGE-GUIDED-DOMAINS1

- kind: backend producer coverage with app-visible parity verification
- result: pass
- coverage: 100 fixtures, 51 route families, 262 leaves, 212 proven, 24 bounded exemptions, 26 missing Matrix/Vector leaves, 60,801 serialized bytes, and a 2,753-byte maximum document
- producer evidence: native Trigonometry, Geometry, Statistics, and Table values reach their workspace-owned final adapters without parsing formatted output or promoting normalized input
- payload: 20 guided documents grow from 8,237 bytes without optional MathJSON to 11,592 current bytes; three five-cold/fifty-warm reruns report zero blocked metrics
- regression: all 100 native probes, 43 golden cases, 100 replay fixtures, 54 result-contract tests, 76 worker/runtime contracts, 180 Display contract tests, and 485 UI tests pass
- static: TypeScript, global lint, production build, file-size, OOE, compartments, Surface, seam, printer, detail, clipboard, inversion, Equation-carrier, and diff-hygiene gates pass
- visual: all 19 Chromium canaries pass with zero retries; eight focused guided cards/tables preserve exact results, warnings, rows, and horizontal overflow behavior
- residual: 26 Matrix/Vector leaves remain for `MATHJSON-COVERAGE-LINEAR-ALGEBRA1`; no Notebook source or untracked `test-results/` is part of this checkpoint

## MATHJSON-COVERAGE-LINEAR-ALGEBRA1

- kind: backend producer coverage with app-visible parity verification
- result: pass
- coverage: 100 fixtures, 51 route families, 262 leaves, 231 proven, 31 bounded exemptions, zero missing, 62,074 serialized bytes, and a 2,753-byte maximum document
- producer evidence: Matrix and Vector preserve native exact values through independent workspace-owned final adapters; DEG/RAD angles carry proven trees while GRAD remains canonical-only rather than misrepresenting its unit marker as an exponent; no formatted output parsing, input-tree promotion, universal AST, or runtime-topology change is present
- exemptions: seven Matrix linear-system detail leaves retain exact augmented-rank, augmented-RREF, and row-operation narration because those compatibility strings are not valid standalone trees; separately structured solution, rank, and count math is proven
- payload: ten Matrix/Vector documents grow from 3,843 bytes without optional MathJSON to 5,116 current bytes; three five-cold/fifty-warm reruns report warm P95 of 0.040-0.042 ms and zero blocked metrics
- regression: all 535 unit files and 3,718 tests, 67 UI files and 485 tests, 100 coverage probes, 43 golden cases, 100 replay fixtures, 19 Chromium canaries, nine History browser journeys, and three Linear Algebra trust flows pass
- static: result, printer, detail, clipboard, inversion, Surface, seam, OOE, compartment, CI, app-identity, TypeScript, lint, production build, Rust, file-size, and diff-hygiene gates pass
- visual: ten focused Matrix/Vector Chromium routes preserve exact answers, established detail counts, and zero card/page horizontal overflow
- verification repair: the intentionally exhaustive 100-probe test uses a 120-second local timeout after the full suite demonstrated the previous 30-second cap was contention-sensitive; focused execution remains about 15 seconds and no payload or correctness threshold changed
- residual: coverage classification is complete; `MATHJSON-COVERAGE-CLOSEOUT1` must prove the aggregate corpus and registry closeout before runtime-envelope migration begins

## MATHJSON-COVERAGE-CLOSEOUT1

- kind: backend aggregate MathJSON coverage closeout
- result: pass
- coverage: 143 native executions across 57 route families, comprising all 100 replay fixtures and all 43 golden cases; 458 leaves divide into 394 producer-proven standard MathJSON trees, 64 exact exemptions, and zero missing classifications
- corpus split: replay remains 262 leaves with 231 proven and 31 exempt; golden contributes 196 leaves with 163 proven and 33 exempt
- producer evidence: Calculate calculus ASTs and bounds, guided route facts, exact Trigonometry landmarks, Geometry branch values, Matrix profiles, and Vector independence relations enter only through workspace-owned proof adapters; formatted output and normalized input remain prohibited sources
- payload: aggregate accepted bytes are 107,318 with a 2,753-byte maximum; 43 golden documents grow from 35,711 compatibility bytes to 45,244 current bytes and three five-cold/fifty-warm clone comparisons report warm P95 of 0.377-0.381 ms with no blocked metric
- focused regression: four coverage-ratchet tests, 27 producer-contract tests, 38 Calculate/Calculus tests, 80 guided/Linear Algebra tests, and 44 golden-output tests pass
- static: incremental TypeScript, focused changed-file lint, file-size, memory-protocol, and diff-hygiene gates pass
- visible behavior: no display string, result, branch, action, warning, detail, or Table row changes; per-workspace Playwright evidence from the preceding coverage slices remains valid and was not redundantly rerun
- resource posture: no full unit, UI, canary, build, or browser suite ran; the one failed sorted-ID assertion received only its targeted rerun
- residual: `EQUATION-STAGE-CARRIER-GUARDED1` begins the approved Equation transport cleanup

## EQUATION-STAGE-CARRIER-GUARDED1

- kind: backend Equation stage-transport migration with focused UI parity evidence
- result: pass
- contract: shared merge accepts and returns `EquationSolveResultContractV1`; synchronous/asynchronous substitution and composition convert recursive outcomes immediately, while prompts fail closed
- inventory: 677 producer boundaries, 603 consumer observations, 171 native paths, 47 owner assemblies, one legacy-History compatibility projection, and 411 registered legacy reads; Equation has 141 native paths and zero compatibility producers
- regression: 12 focused Equation files and 192 tests pass, including six golden Equation executions, 25 replay fixtures, recursive stage routing, substitution, composition, and solve-result contracts; the 22-test AST ratchet also passes
- static: incremental TypeScript, production build, inversion ratchet and accepted baseline, focused lint, file-size, memory protocol, and diff hygiene pass
- visual: five Chromium Equation flows pass; three inspected screenshots preserve domain facts, periodic structure, candidate evidence, solve summaries, and horizontal readability
- resource posture: no full unit, UI, or 19-canary suite ran; verification stayed impact-selected
- residual: `EQUATION-STAGE-CARRIER-CLOSEOUT1` removes remaining guarded-stage Display return/read-model transport
