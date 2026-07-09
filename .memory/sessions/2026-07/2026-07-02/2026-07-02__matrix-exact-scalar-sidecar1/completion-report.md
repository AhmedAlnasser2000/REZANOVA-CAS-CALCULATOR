# MATRIX-EXACT-SCALAR-SIDECAR1 Completion Report

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live

## Summary

`MATRIX-EXACT-SCALAR-SIDECAR1` adds optional exact scalar metadata to Matrix editor-originated requests.

What changed:

- Added public `ExactScalarWire` sidecars for Matrix request/replay data.
- Parsed inline Matrix/vector `bmatrix` entries as both numeric values and exact rational metadata.
- Preserved exact integers, `\frac{}` entries, and finite decimals such as `0.125 = 1/8`.
- Propagated sidecars through Matrix editor dispatch, OOE snapshots, worker payloads, and history schema validation.
- Made determinant, rank/RREF, and structured system paths prefer exact sidecars before falling back to old safe-integer numeric conversion.
- Kept numeric grids, old replay seeds, Vector requests, Equation internals, and automatic Equation routing unchanged.

## Durable Memory Updated

- `.memory/current-state.md`
- `.memory/decisions.md`
- `.memory/journal/2026-07/2026-07-02.md`
- `.memory/sessions/2026-07/2026-07-02/2026-07-02__matrix-exact-scalar-sidecar1/completion-report.md`
- `.memory/sessions/2026-07/2026-07-02/2026-07-02__matrix-exact-scalar-sidecar1/verification-summary.md`
- `.memory/sessions/2026-07/2026-07-02/2026-07-02__matrix-exact-scalar-sidecar1/commit-log.md`
