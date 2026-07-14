# Canonical Result V2 Verification Summary

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

## CANONICAL-RESULT-V2-AUDIT0

- result: pass; committed as `a3fce955`
- kind: backend audit/documentation
- scope: schema laws, exact 23-leaf inventory, producer-version map, consumer matrix, parity baseline, stop rules, acceptance checklist, and approval record
- runtime/UI impact: none
- verification: memory protocol, file-size, and diff hygiene
- protected state: `test-results/` excluded

## CANONICAL-RESULT-V2-CONTRACT1

- result: pass; committed as `8dd5ca29`
- kind: backend contract
- scope: V2 types, strict schemas, proof-branded document/action builders, V1/V2 router, version-paired inactive runtime envelope, and frozen 57-route V1 registry
- production impact: none; live producers and `CanonicalRuntimeOutcome` remain V1
- focused verification: 8 V2 contract tests; 20 focused proof/runtime/V2 tests; full result-contract suite
- ratchets: incremental TypeScript; display inversion 401 producers / 149 native documents / 57 consumer reads / zero compatibility / zero legacy; file-size validation
- protected state: concurrent Notebook files and `test-results/` excluded

## CANONICAL-RESULT-V2-CONSUMER-HISTORY1

- result: pass; committed as `12a91729`
- kind: backend consumer/runtime/History migration
- scope: normalized V1/V2 authority, live version-paired V2 runtime, dual-version History, and normalized Display/clipboard/print/diagnostics/Surface consumers
- production impact: V2 is readable and persistable; all 57 production producer routes remain V1
- focused verification: 75 result-contract tests; 6 History replay tests plus import boundary; 40 Surface Protocol tests plus boundary; focused History/runtime/Display/clipboard/diagnostics/worker tests
- browser verification: 5 History persistence/load/render/replay cases and the nine-workspace V1 History replay matrix pass against the current Vite build
- ratchets: incremental TypeScript; display inversion 401 producers / 149 native documents / 57 consumer reads / zero compatibility / zero legacy; file-size validation
- protected state: concurrent Notebook files and `test-results/` excluded

## CANONICAL-RESULT-V2-REQUEST-EVIDENCE1

- result: pass; committed as `2bf24bf6`
- kind: UI producer migration
- scope: derivative-at-point, angle conversion, and right-triangle typed request evidence; four reviewed exemptions removed
- production impact: three approved selectors emit V2; all other frozen routes remain V1; only approved visible correction is derivative `x^2` at `x=3` to primary `6` with title `Derivative`
- focused verification: Calculus/Trigonometry/V2/Display regressions; 75 result-contract tests; 6 History replay tests; 40 Surface Protocol tests
- corpus: 143 executable cases / 458 leaves / 439 proven / 19 exempt / zero missing
- browser verification: 2 Chromium scenarios cover three real routes, V2 persistence/replay, request presentation, details, and overflow
- ratchets: incremental TypeScript; Vite build; display inversion 401 producers / 150 native documents / 59 canonical reads / zero compatibility / zero legacy; file-size validation
- protected state: concurrent Notebook files and `test-results/` excluded

## CANONICAL-RESULT-V2-SUPPLEMENT-TABLE1

- result: pass; committed as `ffaf4f2a`
- kind: UI producer migration
- scope: five Equation labeled supplements and three Table undefined cells migrated from reviewed residuals to typed V2 semantics
- production impact: selected Equation results use producer-native `exclusion`/`condition` relations; Table domain-boundary and rational-function cells distinguish values, real-domain failures, and poles
- focused verification: 83 result-contract tests; 19 Equation solve-result tests; 59 Table/replay/golden tests
- corpus: 143 executable cases / 455 leaves / 444 proven / 11 exempt / zero missing
- browser verification: 2 Chromium scenarios cover all five Equation cases, both Table reasons, defined neighbors, V2 persistence/replay for successful results, and overflow
- ratchets: Vite build; display inversion 401 producers / 150 native documents / 59 canonical reads / zero compatibility / zero legacy; file-size validation; diff hygiene
- TypeScript evidence: V2 implementation checkpoint passed; final shared recheck blocked only by concurrent Notebook `NotebookVideoNodeView` import
- protected state: concurrent Notebook and Rust OOE files plus `test-results/` excluded

## CANONICAL-RESULT-V2-TRIGONOMETRY1

- result: pass; committed as `94ea5c52`
- kind: UI producer migration
- scope: Period & Phase typed compound primary with normalized equation, period, and phase-shift semantics; one reviewed exemption removed
- production impact: Period & Phase emits V2 for sine, cosine, tangent, all angle units, and symbolic affine offsets; existing visible primary/detail presentation is retained
- focused verification: 75 Trigonometry tests; 87 result-contract tests including all golden and replay executions
- corpus: 143 executable cases / 457 leaves / 447 proven / 10 exempt / zero missing; route is 15/15/0/0
- browser verification: 1 Chromium scenario covers all carriers/units, details, three History rows, replay, and overflow
- ratchets: incremental TypeScript; Vite build; display inversion 404 producers / 150 native documents / 59 canonical reads / zero compatibility / zero legacy; diff hygiene
- file-size status: exact staged index passes all 1,849 tracked TypeScript caps; mutable shared-tree command is blocked only by concurrent Notebook `NotebookRichCanvas.tsx` at 1,120 lines
- protected state: concurrent Notebook and Rust OOE files plus `test-results/` excluded

## CANONICAL-RESULT-V2-LINEAR-ALGEBRA1

- result: pass; pending commit creation under standing approval
- kind: UI producer migration
- scope: Matrix linear-system row operations, Matrix linear-map profiles, and Vector independence migrated to typed V2 semantics; all ten remaining residual leaves removed
- production impact: Matrix linear-system/profile routes default to V2; only the Vector `independent` selector uses V2 while `span` remains frozen V1; visible output is unchanged
- focused verification: 12 Linear Algebra V2 cases; 48 focused Matrix/Vector/producer contract cases; 37 worker/History/workspace cases; all 43 golden and 100 replay presentation executions pass
- corpus: 143 executable cases / 452 leaves / 452 producer-proven / zero exempt / zero missing; Matrix system is 12/12/0/0, profiles are 15/15/0/0, and independence is 11/11/0/0
- browser verification: 2 Chromium scenarios cover square and rectangular profiles, exact row-operation details, dependent and independent vector families, five V2 History rows, replay, and overflow
- ratchets: incremental TypeScript; Vite build; display inversion 404 producers / 150 native documents / 59 canonical reads / zero compatibility / zero legacy; focused lint
- closeout boundary: the executable report already has an empty exemption registry and 452/452 proof; the committed coverage-baseline refresh remains intentionally assigned to `CANONICAL-RESULT-V2-CLOSEOUT0`
- file-size status: exact staged-index validation passes all 1,850 tracked TypeScript caps; the mutable shared-tree command is blocked only by concurrent Notebook `NotebookRichCanvas.tsx` at 1,120 lines
- protected state: concurrent Notebook and Rust OOE files plus `test-results/` excluded
