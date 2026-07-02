# MATRIX-BASIS-COORDINATES-MILESTONE1 Gate B Completion Report

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

- label: Gate B
- type: backend
- scope: Matrix-owned exact coordinate vectors for basis matrices.

## Summary

Gate B adds editor-entered coordinate readback as `coords(B, v)` syntax, where the first argument is a basis matrix and the second argument is an inline vector.

What changed:

- Added `coordinatesA` and `coordinatesB` Matrix operations plus replay, OOE snapshot, and history schema fields for `coordinateVector`, `exactCoordinateVector`, and `coordinateVectorLatex`.
- Added parser and dispatch support for `coords(...)` and `coord(...)`, with inline vector sidecars preserved exactly.
- Added Matrix-owned exact coordinate solving by reducing `B c = v` through the exact Matrix core.
- Coordinate answers render as `[v]_{B}=c` with visible `Coordinate Facts` and `Coordinate Proof` cards.
- Non-basis matrices stop with a controlled educational error and proof cards instead of returning ambiguous coordinates.
- Added `coords` and `coord` to the Matrix variable-hint function allowlist so coordinate expressions do not show false parameter pills.

## Pending In This Milestone

- Change-of-basis matrices remain pending next gate.
- Matrix keypad discoverability for basis/coords can be handled in a later UI gate; this gate focuses on editor execution, readback, replay, and trust cards.

## Durable Memory Updated

- `.memory/sessions/2026-07/2026-07-02/2026-07-02__matrix-basis-coordinates-milestone1/gate-b-completion-report.md`
- `.memory/sessions/2026-07/2026-07-02/2026-07-02__matrix-basis-coordinates-milestone1/gate-b-verification-summary.md`
- `.memory/sessions/2026-07/2026-07-02/2026-07-02__matrix-basis-coordinates-milestone1/gate-b-commit-log.md`

## Shared Memory Note

Shared memory files (`.memory/current-state.md`, `.memory/journal/2026-07/2026-07-02.md`, and `.memory/decisions.md`) already had unrelated cross-agent changes. Gate B records durable memory in the milestone session dossier to avoid staging another lane.
