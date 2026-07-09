# MATRIX-QR-LEAST-SQUARES-MILESTONE1 Gate C Completion Report

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
- scope: Least-squares solve and residual readback through Matrix-owned exact QR.

## Summary

Gate C adds Matrix-owned least-squares solve support with `ls(A,b)` / `ls(B,b)` editor expressions.

What changed:

- Added `leastSquaresA` and `leastSquaresB` Matrix operations.
- Reused the exact QR factors from Gate A to compute `R x_LS = Q^T b`.
- Added fitted-vector and residual readback: `\hat{b}=Ax_LS`, `r=b-\hat{b}`, `||r||^2`, and exact norm when square.
- Added `Least-Squares Solution`, `Residual Vector`, and `Least-Squares Proof` cards, including `Q^T(b-Ax_LS)=0`.
- Routed `ls(...)`, `least(...)`, and `lstsq(...)` through parser, dispatch, history/replay schema, Matrix mode labels, variable hints, and the Matrix keypad shift layer.
- Kept the RHS vector as an inline editor vector using existing RHS sidecar fields; no Equation internals or automatic Equation routing were introduced.

## Pending In This Milestone

- Gate C completes the planned QR/least-squares capability slice for exact independent-column inputs.
- Future work can add rank-deficient least squares, approximate readback polish, and larger QR ergonomics if explicitly scoped.

## Durable Memory Updated

- `.memory/sessions/2026-07/2026-07-02/2026-07-02__matrix-qr-least-squares-milestone1/gate-c-completion-report.md`
- `.memory/sessions/2026-07/2026-07-02/2026-07-02__matrix-qr-least-squares-milestone1/gate-c-verification-summary.md`
- `.memory/sessions/2026-07/2026-07-02/2026-07-02__matrix-qr-least-squares-milestone1/gate-c-commit-log.md`

## Shared Memory Note

Shared memory files (`.memory/current-state.md`, `.memory/journal/2026-07/2026-07-02.md`, `.memory/journal/2026-07/2026-07-03.md`, and `.memory/decisions.md`) already had unrelated cross-agent changes. Gate C records durable memory in the milestone session dossier to avoid staging another lane.

## Cross-Agent Note

Other agents have active staged and unstaged work in Equation, Calculus, symbolic integration, and shared memory files. Gate C is staged and committed with exact pathspecs only.
