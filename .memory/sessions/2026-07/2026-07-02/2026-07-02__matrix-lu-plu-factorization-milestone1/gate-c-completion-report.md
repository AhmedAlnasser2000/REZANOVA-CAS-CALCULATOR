# MATRIX-LU-PLU-FACTORIZATION-MILESTONE1 Gate C Completion Report

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

- label: Gate C
- type: backend
- scope: Explicit LU/PLU solve reuse with visible factorization proof.

## Summary

Gate C adds Matrix-owned `lusolve(...)` and `plusolve(...)` for exact structured solve reuse from the LU and PLU factorization cards.

What changed:

- Added `luSolveA`, `luSolveB`, `pluSolveA`, and `pluSolveB` Matrix operations plus replay schema support.
- Added parser and dispatch support for `lusolve(matrix, rhs)` and `plusolve(matrix, rhs)`.
- Reused existing Matrix RHS fields (`systemRhs`, `exactSystemRhs`, `systemRhsLatex`) for factor-solve replay and OOE snapshots.
- Added exact forward/back substitution over Matrix-owned LU/PLU factors.
- Added readback with `x`, `LU Factors` or `PLU Factors`, row swaps for PLU, and a visible `Factor Solve Proof` card.
- Kept general `Ax=b` and `Ax+b=0` on the existing structured Matrix system route; no Equation internals were imported.
- Added `lusolve` and `plusolve` to the Matrix variable-hint function allowlist.

## Pending In This Milestone

- Later gates can add a keypad/discoverability pass for `lu`, `plu`, `lusolve`, and `plusolve` if the UI needs a visible operation cluster.

## Durable Memory Updated

- `.memory/sessions/2026-07/2026-07-02/2026-07-02__matrix-lu-plu-factorization-milestone1/gate-c-completion-report.md`
- `.memory/sessions/2026-07/2026-07-02/2026-07-02__matrix-lu-plu-factorization-milestone1/gate-c-verification-summary.md`
- `.memory/sessions/2026-07/2026-07-02/2026-07-02__matrix-lu-plu-factorization-milestone1/gate-c-commit-log.md`

## Shared Memory Note

Shared memory files (`.memory/current-state.md`, `.memory/journal/2026-07/2026-07-02.md`, and `.memory/decisions.md`) already had unrelated cross-agent changes. Gate C records durable memory in the milestone session dossier to avoid staging another lane.
