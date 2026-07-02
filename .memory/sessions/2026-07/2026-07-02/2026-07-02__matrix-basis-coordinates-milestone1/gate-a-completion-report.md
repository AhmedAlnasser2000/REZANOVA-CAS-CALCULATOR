# MATRIX-BASIS-COORDINATES-MILESTONE1 Gate A Completion Report

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5-codex
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5-codex
- verified_by_agent: codex
- verified_by_agent_model: gpt-5-codex
- attribution_basis: live

## Gate

- label: Gate A
- type: backend
- scope: Matrix-owned basis validation for exact matrix columns.

## Summary

Gate A adds the `basis(...)` Matrix operation as the foundation for later coordinates and change-of-basis work.

What changed:

- Added `basisA` and `basisB` to Matrix operation/replay schemas.
- Added parser and dispatch support for editor-entered `basis(A/B)` and inline `basis(bmatrix)` forms.
- Added Matrix-owned exact basis validation using RREF rank/pivots and determinant when the matrix is square.
- Basis readback reports whether the columns form a basis, plus `Basis Facts` and `Basis Proof` cards.
- Basis proof cards are visible by default alongside the existing linear-algebra proof cards.

## Pending In This Milestone

- Coordinates `[v]_B` and change-of-basis matrices are still pending next gates.
- This gate intentionally avoids selecting a change-of-basis direction convention until that gate defines it explicitly in readback.

## Durable Memory Updated

- `.memory/sessions/2026-07/2026-07-02/2026-07-02__matrix-basis-coordinates-milestone1/gate-a-completion-report.md`
- `.memory/sessions/2026-07/2026-07-02/2026-07-02__matrix-basis-coordinates-milestone1/gate-a-verification-summary.md`
- `.memory/sessions/2026-07/2026-07-02/2026-07-02__matrix-basis-coordinates-milestone1/gate-a-commit-log.md`

## Shared Memory Note

Shared memory files (`.memory/current-state.md`, `.memory/journal/2026-07/2026-07-02.md`, and `.memory/decisions.md`) already had unrelated cross-agent changes. Gate A records durable memory in the milestone session dossier to avoid staging another lane.
