# GOLDEN-CORPUS-REGISTRY1 Gate

## Attribution
- primary_agent: codex
- primary_agent_model: gpt-5.6
- primary_agent_family: sol
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.6
- recorded_by_agent_family: sol
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.6
- verified_by_agent_family: sol
- attribution_basis: live

## Gate Type
- `backend`: direct native golden corpus, adapters, and registry ratchets.
- `ui`: required real Chromium inspection of all 16 new app-visible cases.

## Scope
- Preserved the existing 27 Calculate and Equation cases.
- Added exactly 16 rich-success cases across Calculate, Calculus, Trigonometry, Geometry, Statistics, Matrix, Vector, and Table for an exact initial total of 43.
- Added one reusable `GoldenExecution` with optional Table response evidence.
- Ratcheted unique IDs and at least two cases for each launcher-derived computational workspace excluding Labs.
- Kept Equation and Calculus benchmark ledgers outside this fast corpus.

## Evidence
- `npm run test:golden`: 44/44 passed.
- Temporary Chromium audit: 16/16 passed in 55.7 seconds; all screenshots inspected without clipping, overlap, unreadable output, or unresolved product errors.
- `npm run test:canaries:browser`: 19/19 passed in 1.2 minutes.
- `npm run test:canary-registry`: 3/3 passed.
- TypeScript, build, lint, OOE boundaries, compartment boundaries, file-size ratchet, and diff hygiene passed.
- Initial audit-only failures were route/action selector mismatches. A later zero-result screenshot was traced to the temporary driver redundantly filling an already-defaulted Lower field, which appended `0` to the active MathLive editor; removing that fill produced and asserted `1.570796` without production changes.

## Durable Boundary
- Native golden execution does not replace OOE, worker, or browser evidence.
- Trigonometry equation math remains covered by its native core; the current browser surface for equation entry is Equation.
- Statistics guided-control expansion and Matrix/Vector feature growth remain frozen/out of scope through Move 9.

## Outcome
- `verification-pass`; Behavioral Ratchet 6 is ready for the approval-gated commit.

## Memory Updated
- `.memory/current-state.md`
- `.memory/decisions.md`
- `.memory/journal/2026-07/2026-07-10.md`
- `.memory/research/roadmaps/anti-regression-nine-move-roadmap.md`
- This master dossier's status, completion, verification, commit log, and Move 6 gate record.

## Next
- Request explicit approval for the `GOLDEN-CORPUS-REGISTRY1` commit.
- Begin `PRINT-HYGIENE-BASELINE1` only after that commit checkpoint.
