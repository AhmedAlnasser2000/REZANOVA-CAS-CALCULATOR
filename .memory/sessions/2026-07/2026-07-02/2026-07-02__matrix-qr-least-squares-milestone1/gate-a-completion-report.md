# MATRIX-QR-LEAST-SQUARES-MILESTONE1 Gate A Completion Report

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
- scope: Exact column QR readback foundation for Matrix.

## Summary

Gate A adds Matrix-owned `qr(A)`, `qr(B)`, and inline `qr(...)` execution for matrices whose Gram-Schmidt residual lengths are rational.

What changed:

- Added exact QR factorization with `Q`, `R`, `Q^{T}Q`, `QR`, and column-step readback.
- Added controlled stops for wide matrices, dependent columns, non-rational exact norms, incomplete matrices, and exact arithmetic limits.
- Routed `qr(...)` through the Matrix editor parser, dispatch, replay schema, Matrix mode labels, runtime shell tests, variable hints, and Matrix keypad overlay.
- Kept `QR Factors` and `QR Proof` visible by default; `QR Column Steps` is collapsible/collapsed by default.
- Compacted Matrix unary editor dispatch into a table so QR could land without growing the capped dispatch file.

## Pending In This Milestone

- Later gates should build least-squares projection and residual readback on top of this QR foundation.
- Irrational-norm exact readback still needs a richer radical scalar representation before full exact QR can display all common cases.

## Durable Memory Updated

- `.memory/sessions/2026-07/2026-07-02/2026-07-02__matrix-qr-least-squares-milestone1/gate-a-completion-report.md`
- `.memory/sessions/2026-07/2026-07-02/2026-07-02__matrix-qr-least-squares-milestone1/gate-a-verification-summary.md`
- `.memory/sessions/2026-07/2026-07-02/2026-07-02__matrix-qr-least-squares-milestone1/gate-a-commit-log.md`

## Shared Memory Note

Shared memory files (`.memory/current-state.md`, `.memory/journal/2026-07/2026-07-02.md`, and `.memory/decisions.md`) already had unrelated cross-agent changes. Gate A records durable memory in the milestone session dossier to avoid staging another lane.
