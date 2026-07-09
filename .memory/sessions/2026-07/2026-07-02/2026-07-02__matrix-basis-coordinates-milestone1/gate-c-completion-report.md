# MATRIX-BASIS-COORDINATES-MILESTONE1 Gate C Completion Report

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
- scope: Matrix-owned exact change-of-basis matrices.

## Summary

Gate C adds editor-entered change-of-basis readback as `change(A,B)`.

Convention locked in this gate:

- `change(A,B)` means convert coordinates from basis `A` into basis `B`.
- The returned matrix is `P_{B<-A}=B^{-1}A`.
- Each column solves `B c = a_i`, so the source basis vectors are rewritten in the target basis.

What changed:

- Added `changeBasis` Matrix operation and replay schema support.
- Added parser and dispatch support for `change(...)` and `changebasis(...)`.
- Added Matrix-owned exact change-of-basis computation by solving one exact system per source-basis column.
- Added `Change-of-Basis Facts` and `Change-of-Basis Proof` cards, visible by default and collapsible.
- Added non-basis controlled stops with proof cards.
- Added `change` and `changebasis` to the Matrix variable-hint function allowlist.

## Pending In This Milestone

- A small UI/keypad discoverability gate can add visible `basis`, `coords`, and `change` Matrix keys if desired; Gates A-C have completed the backend/editor/replay capability.

## Durable Memory Updated

- `.memory/sessions/2026-07/2026-07-02/2026-07-02__matrix-basis-coordinates-milestone1/gate-c-completion-report.md`
- `.memory/sessions/2026-07/2026-07-02/2026-07-02__matrix-basis-coordinates-milestone1/gate-c-verification-summary.md`
- `.memory/sessions/2026-07/2026-07-02/2026-07-02__matrix-basis-coordinates-milestone1/gate-c-commit-log.md`

## Shared Memory Note

Shared memory files (`.memory/current-state.md`, `.memory/journal/2026-07/2026-07-02.md`, and `.memory/decisions.md`) already had unrelated cross-agent changes. Gate C records durable memory in the milestone session dossier to avoid staging another lane.
