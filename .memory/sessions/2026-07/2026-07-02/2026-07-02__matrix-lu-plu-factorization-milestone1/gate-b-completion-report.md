# MATRIX-LU-PLU-FACTORIZATION-MILESTONE1 Gate B Completion Report

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live

## Gate

- label: Gate B
- type: backend
- scope: Exact PLU factorization with visible row swaps.

## Summary

Gate B adds Matrix-owned `plu(...)` for exact nonsingular square matrices where pivoting may be required.

What changed:

- Added `pluA` and `pluB` Matrix operations plus replay schema support.
- Added parser and dispatch support for `plu(A/B)`.
- Added exact partial-pivot PLU factorization with permutation matrix `P`, unit-lower `L`, and upper `U`.
- PLU readback returns `P A = L U`, `PLU Factors`, `PLU Row Swaps`, and `PLU Proof` cards.
- Determinant readback applies the row-swap sign to the diagonal product of `U`.
- Singular/rank-deficient pivot stops are controlled and explicit.
- Added `plu` to the Matrix variable-hint function allowlist.

## Pending In This Milestone

- Later gates can add solve reuse from LU/PLU and a Matrix keypad discoverability pass for `lu`/`plu`.

## Durable Memory Updated

- `.memory/sessions/2026-07/2026-07-02/2026-07-02__matrix-lu-plu-factorization-milestone1/gate-b-completion-report.md`
- `.memory/sessions/2026-07/2026-07-02/2026-07-02__matrix-lu-plu-factorization-milestone1/gate-b-verification-summary.md`
- `.memory/sessions/2026-07/2026-07-02/2026-07-02__matrix-lu-plu-factorization-milestone1/gate-b-commit-log.md`

## Shared Memory Note

Shared memory files (`.memory/current-state.md`, `.memory/journal/2026-07/2026-07-02.md`, and `.memory/decisions.md`) already had unrelated cross-agent changes. Gate B records durable memory in the milestone session dossier to avoid staging another lane.
