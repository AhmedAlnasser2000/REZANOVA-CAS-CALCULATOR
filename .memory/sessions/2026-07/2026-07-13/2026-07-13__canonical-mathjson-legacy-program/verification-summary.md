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

## EQUATION-STAGE-CARRIER-CLOSEOUT1

- kind: backend Equation stage-transport closeout with focused UI parity evidence
- result: pass
- contract: guarded runners, synchronous/asynchronous recursion, descriptors, cooperative cancellation, and orchestration carry validated Equation solve-result contracts; public guarded APIs derive Display only at `guarded/run.ts`
- deferred boundary: the established direct-symbolic isolated-worker payload remains Display until `CANONICAL-RUNTIME-OUTCOME1` and is converted immediately at stage entry
- inventory: 648 producer observations, 603 consumer observations, 171 native paths, 47 owner assemblies, one legacy-History compatibility projection, 411 registered legacy reads, and no violations
- regression: 12 focused Equation files and 192 tests pass; the 22-test AST ratchet pins carrier transport and the accepted inventory
- static: incremental TypeScript, focused lint, file-size, and diff hygiene pass; the production build regenerated final artifacts at 16:09:15, while the execution channel lost only Vite's terminal footer after the process exited
- visual: five Chromium Equation flows pass with one worker and zero retries; three inspected screenshots preserve domain facts, periodic structure, candidate evidence, collapsed summaries, and horizontal readability
- resource posture: no full unit, UI, or 19-canary suite ran; no heavy verifier remains running
- residual: `CANONICAL-RUNTIME-OUTCOME1` defines the shared runtime result/action/advisory envelope before workspace migrations

## CANONICAL-RUNTIME-OUTCOME1

- kind: backend shared runtime contract foundation
- result: pass
- contract: canonical result documents plus optional math-valued actions and compact advisories; prompt control flow retains `carryLatex` and does not require a result document
- bounds: 64 actions, 11,024 nodes, depth 65, and 704,000 serialized bytes; nested documents and MathJSON retain their stricter existing bounds
- negative evidence: document-kind mismatch, undeclared display fields, action LaTeX, invalid action MathJSON, malformed advisories, overflow, cycles, and class instances fail closed
- regression: all 13 result-contract files and 70 tests pass; the 22-test inversion ratchet passes with unchanged authority and debt counts
- static: incremental TypeScript, focused lint, production build, file-size, and diff hygiene pass
- visual: not applicable because no runtime producer, worker, consumer, or rendered path changed
- resource posture: no full unit, UI, canary, or browser suite ran
- residual: `CANONICAL-OUTCOME-CALCULATE-EQUATION1` is the first workspace migration onto the validated envelope

## CANONICAL-OUTCOME-CALCULATE-EQUATION1

- kind: backend worker and OOE result-envelope migration with focused UI parity evidence
- result: pass
- contract: Calculate, Equation, and Equation direct-symbolic worker completions carry validated `CanonicalRuntimeOutcome`; public mode wrappers derive the current Display read model only after OOE completes
- Equation evidence: solve-result validation remains the final Equation adapter, while private analysis evidence travels separately for OOE provenance and never becomes canonical result content
- regression: 23 focused worker/OOE/runtime tests and 73 result-contract tests pass; malformed canonical completions fail without fallback and existing cancellation/fallback host semantics remain unchanged
- inventory: 647 producers, 613 consumers, 174 native documents, 47 owner assemblies, one legacy-History compatibility projection, 411 legacy reads, and zero violations
- static: incremental TypeScript, lint, production build, file-size, OOE boundaries, compartments, seam classification, and diff hygiene pass
- visual: the post-build Chromium run passes RAD inverse-trig and Equation quadratic canaries; inspected frames show the Calculate answer/approximation card and Equation `x=2`, `x=3` answer plus Solve Target details without overflow
- verification correction: the first Playwright preview used the prior `dist` and is not counted; the app was rebuilt and the representative cases were rerun against the new worker assets before acceptance
- resource posture: no full unit, UI, or 19-canary suite ran; no heavy process remains active
- residual: `CANONICAL-OUTCOME-SYMBOLIC-CALCULUS1` migrates the next runtime lanes

## CANONICAL-OUTCOME-SYMBOLIC-CALCULUS1

- kind: backend Symbolic/Calculus worker and OOE result-envelope migration with focused UI parity evidence
- result: pass
- contract: the existing Calculus workspace adapter remains the single final owner for derivatives, integrals, limits, series, Laplace, partials, ODE, and IVP; worker, fallback, cancellation, and OOE traffic now carry validated `CanonicalRuntimeOutcome`
- compatibility correction: canonical-result projection always restores `exactLatex`; optional `canonicalMath` remains absent unless primary MathJSON is proven
- regression: 31 focused Calculus/result tests, 12 UI runtime tests, 19 runtime probes, and the 77-test workspace runtime matrix pass; malformed worker completions fail closed
- inventory: 645 producers, 613 consumers, 174 native documents, 47 owner assemblies, one legacy-History compatibility projection, 411 legacy reads, and zero violations
- static: incremental TypeScript, lint, two current production builds, file-size, OOE boundaries, compartments, seam classification, memory protocol, and diff hygiene pass
- visual: fresh Chromium shows derivative `2x`, integral `x^2/2+C`, and canonical-only Calculate cancel-factors `(x+1)/x` with both validity facts and no overflow; one initial Settings-panel startup miss was isolated and the deliberate zero-retry reproduction plus final two-case evidence passed
- resource posture: no full unit, UI, or 19-canary suite ran; verification remained impact-selected
- residual: `CANONICAL-OUTCOME-GUIDED-DOMAINS1` migrates Trigonometry, Geometry, and Statistics worker/OOE envelopes

## CANONICAL-OUTCOME-GUIDED-DOMAINS1

- kind: backend guided-domain worker and OOE result-envelope migration with focused UI parity evidence
- result: pass
- contract: Trigonometry, Geometry, and Statistics workers, fallbacks, cancellation, and OOE jobs carry validated `CanonicalRuntimeOutcome`; parsed request, replay screen, and replay seed stay sibling host metadata and never enter canonical result truth
- public compatibility: each mode derives its established Display payload after OOE completion and suppresses a duplicate `canonicalMath` compatibility field while retaining proven trees in the canonical document
- regression: 19 focused worker/projection tests, four guided producer tests, 25 guided UI runtime tests, 20 runtime probes, and 80 workspace runtime contracts pass; malformed worker outcomes fail closed
- inventory: 648 producers, 613 consumers, 174 native documents, 47 owner assemblies, one legacy-History compatibility projection, 411 legacy reads, and zero violations
- static: incremental TypeScript, lint, production build, file-size, OOE boundaries, compartments, seam classification, and diff hygiene pass
- visual: six guided canaries pass with one worker and zero retries; inspected Trigonometry identity `1`, Geometry `d=5`, and Statistics exact/approximate descriptive summaries remain readable without clipping
- startup note: the first six-canary attempt had one pre-computation Trigonometry Settings-panel miss; a single zero-retry reproduction passed, as did the final Geometry and Statistics evidence
- resource posture: no full unit, UI, or 19-canary suite ran; verification remained impact-selected and no heavy process remains active
- residual: `CANONICAL-OUTCOME-LINEAR-ALGEBRA-TABLE1` migrates Matrix, Vector, and Table without merging their runtime ownership

## CANONICAL-OUTCOME-LINEAR-ALGEBRA-TABLE1

- kind: backend Linear Algebra/Table worker and OOE result-envelope migration with focused UI parity evidence
- result: pass
- contract: Matrix and Vector preserve independent worker entrypoints, clients, hosts, capabilities, shells, fallback hosts, request shapes, and replay ownership; the shared lifecycle ritual now transports validated canonical outcomes
- Table boundary: canonical result truth travels beside the established structured response; malformed completions preserve Table's cooperative fallback semantics, while Matrix and Vector fail closed without post-start retry
- cancellation: Matrix, Vector, and Table hard-stop results are canonical errors; Table stores empty headers/rows and never exposes partial rows
- regression: 32 focused runtime/Table tests pass after one stale cancellation assertion received a targeted rerun; 35 Matrix/Vector/producer tests, four affected result-contract tests, 21 runtime probes, and 82 workspace runtime contracts pass
- inventory: 641 producers, 613 consumers, 176 native documents, 47 owner assemblies, one legacy-History compatibility projection, 411 legacy reads, and zero violations
- static: incremental TypeScript, lint, production build, file-size, OOE boundaries, compartments, seam classification, and diff hygiene pass
- visual: six canaries pass with one worker and zero retries; node captures show Matrix `-2`, Vector `[0,0,1]^T`, and Table rows `(-1,1)`, `(0,0)`, `(1,1)` without clipping
- resource posture: no full unit, UI, or 19-canary suite ran; the broad result-contract attempt exposed one stale assertion and only that affected file was rerun
- residual: `CANONICAL-CONSUMER-DIRECT1` moves remaining semantic consumers onto direct canonical reads

## CANONICAL-CONSUMER-DIRECT1

- kind: backend consumer-authority inversion with focused UI and browser parity evidence
- result: pass
- contract: semantic consumers accept only validated native `CanonicalResultDocumentV1`; `resolveLegacyCanonicalResultForConsumer` isolates the sole old-History display projection
- direct reads: Clipboard, `Ans`, workspace display state, diagnostics, History replay harness, print hygiene, Surface mapping, and current Display/Formula Viewer paths consume canonical documents without result-string fallback
- inventory: 642 producers, 611 consumers, 176 native documents, 47 owner assemblies, one compatibility projection, 410 legacy reads, and zero violations
- regression: 75 result-contract tests, all 100 replay fixtures, 39 Surface tests, 60 Clipboard tests, 26 focused authority/hygiene tests, and 33 History/UI state tests pass
- baselines: print hygiene records newly proven MathJSON fragments with unchanged canonical LaTeX; the inversion baseline records two fewer consumers and one fewer legacy read
- static: incremental TypeScript, lint, production artifact, file-size, Surface boundaries, and diff hygiene pass
- visual: real Chromium clipboard capability plus Calculate, Equation, and Table canaries pass with one worker; inspected Calculate `14` answer/approximation and copy/editor controls are readable with no overflow
- resource posture: no full unit, UI, or 19-canary suite ran; focused commands used at most four Vitest workers and no heavy process remains active
- residual: `HISTORY-CANONICAL-ONLY1` removes legacy result fields and the final compatibility projection while preserving future-version rows inertly

## HISTORY-CANONICAL-ONLY1

- kind: backend History persistence contract with focused UI and real-browser restart evidence
- result: pass
- contract: current V1 entries require one validated canonical result document; legacy result fields are absent, and replay seeds/context remain separate
- cleanup: old and malformed V1 rows are removed atomically with one non-blocking count notice; future result versions stay hidden, byte-preserved, and excluded from V1 retention and clear operations
- overflow: appends over two million bytes retry once after stripping only optional MathJSON and record `canonical-only-fallback`; canonical structure and LaTeX remain identical, and a second overflow fails closed
- inventory: 642 producers, 597 consumers, 177 native documents, zero compatibility projections, 396 registered legacy reads, and zero violations
- regression: 70 focused backend tests, 106 focused UI tests after three targeted stale-assertion corrections, 100 replay fixtures, eight browser-persistence tests, and four Rust History tests pass
- browser: four real Chromium persistence cases pass; inspected Equation History and replay screenshots preserve title, two-variable solution, validity facts, verification details, and readability without saved actions or overflow
- transcript limits: the 35-test `AppMain.ui` run emitted all passing dots but its wrapper lost the final footer; the production build produced the assets used by successful Playwright, but its wrapper likewise lost Vite's terminal footer. Neither heavy command was repeated under the resource-safe policy
- static: incremental TypeScript, accepted inversion baseline, focused lint, memory, file-size, seam, OOE/compartment boundaries, Rust check, and diff hygiene pass. The OOE validator now allows only the exact public result-contract facade used by read-only diagnostics; private result-contract targets remain closed
- resource posture: no full unit, full UI, or 19-canary suite ran; preview and browser processes used for evidence were stopped
- residual: `DISPLAY-DETAIL-LEGACY-CLOSEOUT1` removes duplicate detail/readback presentation transport while retaining canonical-derived `DisplayBlock` models

## DISPLAY-DETAIL-LEGACY-CLOSEOUT1

- kind: backend Display/detail authority closeout with focused UI and real-browser evidence
- result: pass
- contract: live Display details and solve summaries derive from validated canonical documents; `solveSummaryText`, legacy line inference, and compatibility detail recovery are removed
- declaration: all 452 live detail producers declare typed math/text intent; the Display lane has zero registered legacy reads
- inventory: 641 producers, 595 consumers, 177 native documents, 47 owner assemblies, zero compatibility projections, 393 registered legacy reads outside Display, and zero violations
- printer: 527 production result paths contain 289 migrated producers, 225 forwarders, and zero compatibility fallbacks
- regression: 347 affected backend tests, 73 Display-district tests, 14 focused UI tests, 60 app-logic tests, 142 app-runtime UI tests, and 76 result-contract tests pass; the contract corpus includes all 43 golden and 100 replay executions
- boundary repairs: canonical Calculate advisories omit absent fields instead of transporting `undefined`; inline Matrix profile leaves prove against the producer-owned exact matrix node, and Compute Engine comparison exceptions fail closed
- visual: production Chromium inspection covers Equation composition success, Equation range-stop error, Matrix system details, and Vector Gram-Schmidt details; answer/error cards, facts, typed detail math, prose, and overflow remain readable
- static: incremental TypeScript, production build, focused lint, file-size, inversion, compartments, and diff hygiene pass
- resource posture: the user authorized one broader app-runtime pass; it used at most four workers with no concurrent heavy gate. After the two failures were isolated, only the invalidated runtime UI suite was rerun. No full unit or 19-canary suite ran
- residual: test-only Display fixture bridges remain isolated outside production inventory and are removed with `DisplayOutcome`, compatibility projections, and legacy aliases in `RESULT-COMPATIBILITY-REMOVAL1`
