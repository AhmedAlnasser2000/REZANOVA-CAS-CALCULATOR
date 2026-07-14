# CANONICAL-RESULT-V2-LINEAR-ALGEBRA1

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

- kind: ui
- result: pass
- production V2 routes: Matrix linear system, Matrix profile, and Vector independence selector
- residual change: all ten remaining residual leaves and all seven remaining exemption rules are removed
- protected state: concurrent Notebook video and Rust OOE work plus untracked `test-results/` were excluded

## Prerequisite Representation

- Matrix systems retain `ExactMatrix`, `ExactVector`, exact RREF, and `ExactRowOperation` as their native producer representation. V2 maps visible operations to one-based swap/scale/eliminate semantics and proves exact signed factors.
- Matrix profiles retain exact column-family analysis as their native representation. V2 carries the exact operand matrix, domain/codomain dimensions, rank, and nullity separately from adapter-owned presentation.
- Vector independence retains exact operand vectors and exact column-family analysis. V2 carries those vectors and the native Boolean nullity verdict separately from the labeled compatibility presentation.
- No worker, host, capability ID, request shape, replay seed, runtime shell, History identity, or OOE ownership changed.

## Implemented

- Added V2 Matrix and Vector proof resolvers over producer-owned exact leaves. Missing or conflicting proof throws; no V1 fallback exists on selected V2 routes.
- Added typed row-operation detail parts with exact signed factors and one-based row numbers while retaining the existing rendered arrows. The already-reduced case stays honest prose.
- Added compound profile and independence primaries. Their current primary and answer rows remain adapter-produced presentation, while consumers receive exact typed semantics and never parse those strings.
- Added an explicit V2 adapter answer-row override so compound primaries can retain compatibility rows as presentation without manufacturing semantic MathJSON for them.
- Kept Matrix profile/system routes on default V2, selected only Vector independence for V2, and retained Vector span on the frozen V1 inventory.
- Proved inconsistent, single-parameter, and multi-parameter Matrix-system primaries through standard producer-constructed MathJSON without parsing presentation output.

## Verification

- Focused Linear Algebra V2 tests: 12/12 pass, covering swap, scale, signed eliminate, no operation, square and rectangular profiles, independent/dependent families, frozen V1 span, and inconsistent plus one-/multi-parameter systems.
- Focused Matrix/Vector/producer contracts: 48/48 pass. Worker, History replay, schema parity, and workspace tests: 37/37 pass.
- The 43 golden and 100 History replay executions retain presentation parity. The executable MathJSON report is 143 cases, 452 leaves, 452 producer-proven, zero exempt, and zero missing. Route totals are Matrix system 12/12/0/0, profiles 15/15/0/0, and independence 11/11/0/0.
- Incremental TypeScript, the production Vite build, focused lint, and display inversion pass. Inversion remains 404 producer boundaries, 150 native documents, 59 canonical reads, zero compatibility projections, and zero legacy reads.
- Chromium: 2/2 focused real-app scenarios pass, covering square/rectangular profile cards, exact row-operation details, dependent/independent vector families, five V2 History rows, replay, and no observed horizontal overflow.
- Exact staged-index validation passes all 1,850 tracked TypeScript caps. The mutable shared-tree file-size command is blocked only by concurrent Notebook video work growing `src/app/shell/notebook/canvas/NotebookRichCanvas.tsx` to 1,120 lines.

## Closeout Boundary

- `tools/mathjson-coverage-baseline.json` still records the preceding gate by design. Its accepted refresh to the observed 452/452/0/0 corpus is explicitly owned by `CANONICAL-RESULT-V2-CLOSEOUT0`; this is the only expected result-contract failure before closeout.
- Gate 8 must retain the empty exemption registry as the anti-regression ratchet, refresh the coverage baseline, remove obsolete residual-only compatibility code, resolve the V2 open question, run the announced aggregate gate alone, and complete the browser History replay/visual matrix.
