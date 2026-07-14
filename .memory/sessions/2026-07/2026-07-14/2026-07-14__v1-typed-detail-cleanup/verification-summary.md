# V1-Compatible Typed-Detail Cleanup Verification Summary

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

## V1-TYPED-DETAIL-CALCULUS1

- kind: backend producer-detail cleanup with focused UI and browser evidence
- result: pass; awaiting commit approval
- coverage: 460 leaves, 410 proven, 50 exemptions, zero missing
- contracts: 63 result-contract tests pass; 449 live detail producers remain declared; result intent has zero violations
- focused regression: 24 backend tests, 11 UI tests, all 100 replay fixtures, and all 143 coverage evidence executions pass
- visual: ordinary derivative, implicit derivative, mixed partial, expanded details, compact History, and overflow inspected in Chromium
- static: incremental TypeScript, changed-file lint, file-size, memory, and diff hygiene pass
- protected lane: concurrent Notebook changes and `test-results/` excluded; no push

## V1-TYPED-DETAIL-TRIGONOMETRY1

- kind: backend producer-detail cleanup with focused UI and browser evidence
- result: pass; approved for commit
- coverage: 459 leaves, 416 proven, 43 exemptions, zero missing; Period and Phase is 13/12/1/0
- contracts: 63 result-contract tests pass; 450 live detail producers are declared; result intent has zero violations
- focused regression: all 13 Trigonometry core tests pass
- visual: RAD answer, expanded Wave Facts, collapsed landmarks, compact History, and overflow inspected in Chromium; Formula Viewer is not exposed for this compact result
- static: incremental TypeScript, changed-file lint, file-size, memory, and diff hygiene pass
- protected lane: concurrent Notebook changes and `test-results/` excluded; no push

## V1-TYPED-DETAIL-MATRIX-SYSTEM1

- kind: backend producer-detail cleanup with focused UI and browser evidence
- result: pass; approved for commit
- coverage: 460 leaves, 420 proven, 40 exemptions, zero missing; Matrix linear system is 12/8/4/0
- contracts: all 63 result-contract tests pass; 455 live detail producers are declared; golden and replay result-intent coverage passes
- replay: the 100-fixture hard-comparison harness passes, including the refreshed Matrix linear-system fixture
- authority: display-inversion ratchet passes with unchanged counts and zero compatibility or legacy reads after accepting three moved owner-assembly fingerprints
- seam: Matrix and canonical-result-contract impact is classified without changing baseline CI requirements
- focused regression: 6 Matrix-system and 17 Matrix-mode tests pass, including unique, inconsistent, and underdetermined native MathJSON evidence
- visual: expanded System Proof, Rank Facts, and Augmented RREF, collapsed row operations, History replay, and overflow inspected in one-worker Chromium; Formula Viewer is not exposed for this compact result
- static: incremental TypeScript, changed-file lint, file-size, and diff hygiene pass
- protected lane: Notebook changes committed independently; `test-results/` excluded; no push

## V1-TYPED-DETAIL-LINEAR-ALGEBRA-PROFILES1

- kind: backend producer-detail cleanup with focused UI and browser evidence
- result: pass; approved for commit
- coverage: 455 leaves, 432 proven, 23 exemptions, zero missing; Matrix profile is 21/17/4/0 and Vector span/independence is 10/8/2/0
- contracts: MathJSON coverage, detail migration, result intent, display inversion, and focused producer authority pass; one stale Matrix-system count assertion found by the broad result-contract run was corrected and its focused 14-test contract passes
- focused regression: 30 Matrix/Vector producer and mode tests pass; all 43 golden executions pass
- visual: Vector span/independence, singular and rectangular Matrix profiles, compact History replay, and overflow were inspected in Chromium; no Formula Viewer control appears for these compact results
- static: incremental TypeScript, changed-file lint, file-size, Vite production build, and diff hygiene pass
- protected lane: concurrent Notebook persistence/library work and `test-results/` excluded; no push

## V1-TYPED-DETAIL-CLOSEOUT0

- kind: backend contract/fixture/documentation closeout
- result: pass; approved for commit
- registry: 20 live rules classify exactly 23 residual leaves; ten obsolete detail-label rules are removed and the four-arrow Matrix row-operation rule remains
- contracts: all 63 result-contract tests pass, including all 43 golden and 100 replay executions; MathJSON coverage is 455/432/23/0
- replay and presentation: the standalone 100-fixture replay, 43-case golden corpus, print-hygiene manifest, and 5 focused Display UI tests pass
- visual: Move 4's final focused Chromium run passes 2/2 with inspected Vector, singular/rectangular Matrix, and readable History replay evidence; closeout changes no app output beyond the already verified moves
- static: scoped lint, file-size, memory protocol, diff hygiene, and Vite production build pass
- TypeScript: passed at the Move 4 checkpoint; the closeout recheck is blocked only by three invalid `exact` options in concurrent untracked `NotebookLibrary.ui.test.tsx`, not by V1 files
- resource posture: focused closeout tests only; no full unit, UI, or canary suite ran
- protected lane: concurrent Notebook document-library/Rust work and `test-results/` excluded; no push
