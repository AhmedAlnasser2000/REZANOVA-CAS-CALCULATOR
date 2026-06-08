# TRACK-OOE-RS34 Manual Verification Checklist

Milestone: `OOE-RS34: Linear Algebra Runtime Shell And Launch Tickets`

Date: 2026-06-08

Agent: codex

Model: gpt-5.5

## Scope

- Move Matrix and Vector onto one shared Linear Algebra runtime shell.
- Add `linear-algebra-worker-runtime` as the primary isolated worker host and `linear-algebra-runtime` as init/unavailable fallback.
- Keep Matrix and Vector as separate visible workspaces and separate OOE capabilities:
  - `linearAlgebra.matrix`
  - `linearAlgebra.vector`
- Add launch tickets for explicit Matrix and Vector operations.
- Add typed Matrix/Vector replay seeds for new completed History entries.
- Preserve legacy seedless Matrix/Vector replay.
- Do not change Matrix/Vector math behavior, taxonomy, exact linear algebra capability, Rust solver execution, or scheduler policy.

## Manual Checks

- [ ] Matrix operation shows `Computing` while active.
- [ ] Vector operation shows `Computing` while active.
- [ ] Matrix pending History row appears immediately with Running/Stopping and Stop.
- [ ] Vector pending History row appears immediately with Running/Stopping and Stop.
- [ ] Stop from the header or pending row removes the pending Matrix/Vector ticket and does not persist a fake completed record.
- [ ] Matrix completion finalizes the pending row in launch-order position.
- [ ] Vector completion finalizes the pending row in launch-order position.
- [ ] Switching modes during a Matrix/Vector run does not yank the user back on completion.
- [ ] New Matrix replay restores matrix grids from `matrixSeed`.
- [ ] New Vector replay restores vector grids and angle unit from `vectorSeed`.
- [ ] Legacy Matrix/Vector records without seeds remain loadable/replayable.
- [ ] OOE diagnostics show Linear Algebra runtime-shell host, fallback/cancel/failure, ticket id/order, and background-vs-visible evidence.

## Automated Verification Notes

- Focused linear algebra worker/runtime tests cover Matrix/Vector worker parity, init/unavailable fallback, runtime failure, and hard-stop cancellation.
- History schema tests cover `matrixSeed` and `vectorSeed`.
- OOE boundary validation now includes `linear-algebra-pilot.ts` and the previously missing `statistics-pilot.ts` pilot tier entries.

## Boundaries

- No Matrix/Vector UI merge.
- No exact linear algebra expansion.
- No Calculate, Trigonometry, Geometry, or Statistics migration changes.
- No solver behavior change.
- No Rust solver execution.
- No public diagnostics expansion.
