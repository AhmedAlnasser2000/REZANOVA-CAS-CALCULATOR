# V1-TYPED-DETAIL-LINEAR-ALGEBRA-PROFILES1

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

- labels: backend, ui
- result: pass; user approval covers commit creation
- behavior: newly computed Matrix profile and Vector span/independence details use sentence-case prose plus producer-owned scalar, set, vector, and matrix values
- boundaries: no schema, renderer, History, worker, OOE, consumer, capability, topology, or mathematical change
- protected lane: Notebook persistence and document-library work remained independently owned; untracked `test-results/` remained excluded

## Changes

- Typed Matrix rank-nullity, pivot, kernel, image, determinant, and RREF facts as prose labels around native values; one-to-one, onto, and invertibility classifications remain prose.
- Typed Vector span dimension, pivot columns, selected basis, and RREF evidence while preserving exact basis-vector and dependence-relation rows.
- Added producer-owned standard MathJSON for the exposed scalars, index sets, exact vector sets, and matrices without parsing rendered output.
- Updated the two Matrix-profile golden expectations and the Matrix-system producer leaf-count proof to the already committed typed-detail shape.

## Coverage

- aggregate: 460/420/40/0 to 455/432/23/0 for total/proven/exempt/missing
- `matrix.profile`: 21 leaves, 17 proven, 4 exempt
- `vector.span-independence`: 10 leaves, 8 proven, 2 exempt
- remaining profile exemptions: two compound Matrix primaries, two Matrix map rows, one Vector compound primary, and its repeated answer row

## Verification

- focused Matrix/Vector producer and mode tests: 30 tests pass
- result contract: 62 of 63 tests passed in the broad run; its sole stale Matrix-system count assertion was corrected, and the focused 14-test producer contract then passed
- MathJSON coverage: 455 leaves, 432 proven, 23 exempt, zero missing
- detail migration: 455 declared, zero undeclared
- result intent: zero direct-summary violations; all 43 golden and 100 replay intent executions pass
- golden corpus: all 43 executable cases plus the corpus ratchet pass (44 tests)
- display inversion: 23 ratchet tests pass with 401 producers, 149 native documents, 57 direct consumers, zero compatibility projections, and zero legacy reads
- Chromium: Vector span/independence, singular Matrix profile, rectangular Matrix profile, compact History replay, Formula Viewer absence, and overflow pass with one worker; screenshots were inspected for readability
- static: incremental TypeScript, changed-file lint, file-size, Vite production build, and diff hygiene pass
- resource posture: focused tests only; no full unit, UI, or canary suite ran

## Evidence

- `.task_tmp/vector-foundations-linear-map-profile/vector-span-independence-history.png`
- `.task_tmp/vector-foundations-linear-map-profile/matrix-linear-map-profile-singular.png`
- `.task_tmp/vector-foundations-linear-map-profile/matrix-linear-map-profile-history.png`
- `.task_tmp/vector-foundations-linear-map-profile/matrix-linear-map-profile-rectangular.png`

## Handoff

- Commit this approved gate as `V1-TYPED-DETAIL-LINEAR-ALGEBRA-PROFILES1`.
- Continue with `V1-TYPED-DETAIL-CLOSEOUT0`.
- Do not stage Notebook files or `test-results/`; do not push.
