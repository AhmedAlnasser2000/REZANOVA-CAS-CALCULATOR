# MATRIX-QR-LEAST-SQUARES-MILESTONE1 Gate B Completion Report

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
- scope: Projection onto Matrix column spaces through exact QR.

## Summary

Gate B adds Matrix-owned column-space projection with `projcol(A,b)` / `projcol(B,b)` / inline matrix forms.

What changed:

- Added `columnProjectionA` and `columnProjectionB` Matrix operations.
- Reused the exact QR factors from Gate A to compute `proj_Col(A)(b)=QQ^Tb`.
- Added `Column Projection Facts` and `Column Projection Proof` cards showing `Q`, `Q^TQ`, `Q^Tb`, the projected vector, residual vector, and `Q^T` residual zero check.
- Routed `projcol(...)` through parser, dispatch, history/replay schema, Matrix mode labels, variable hints, and Matrix keypad shift layer on `col`.
- Kept the RHS vector as an inline editor vector using existing RHS sidecar fields; no Equation internals or automatic Equation routing were introduced.

## Pending In This Milestone

- Later gates should add least-squares solution readback and residual norm/quality cards.
- Full dependent-column projection needs a rank-revealing QR or column-space basis route; this gate intentionally uses the independent-column QR foundation.

## Durable Memory Updated

- `.memory/sessions/2026-07/2026-07-02/2026-07-02__matrix-qr-least-squares-milestone1/gate-b-completion-report.md`
- `.memory/sessions/2026-07/2026-07-02/2026-07-02__matrix-qr-least-squares-milestone1/gate-b-verification-summary.md`
- `.memory/sessions/2026-07/2026-07-02/2026-07-02__matrix-qr-least-squares-milestone1/gate-b-commit-log.md`

## Shared Memory Note

Shared memory files (`.memory/current-state.md`, `.memory/journal/2026-07/2026-07-02.md`, and `.memory/decisions.md`) already had unrelated cross-agent changes. Gate B records durable memory in the milestone session dossier to avoid staging another lane.

## Cross-Agent Note

Another agent advanced `HEAD` with `CALCULUS-LIMITS-ASYMPTOTIC-TERM-IR1` while Gate B was in progress. The Gate B patch remained clean over the new `HEAD`; verification was rerun after the advance.
