# TRACK-OOE-RS26 Manual Verification Checklist

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- attribution_basis: live

## Scope

Verify `OOE-RS26: Equation Guarded-Stage Cancellation Checkpoints`.

This checklist covers cooperative Equation cancellation at guarded-stage boundaries only. It does not cover heavy-helper mid-call interruption, Equation worker isolation, Rust solver execution, public diagnostics UI, scheduler changes, result schema changes, history schema changes, or new solver capability.

## Manual Checks

- Start with an existing Equation result visible, then run a heavier symbolic Equation request and press `Stop`.
- Confirm the header first shows a stop request state, then settles to an Equation-stopped transient status after the cancelled envelope returns.
- Confirm the previous visible Equation result remains in place.
- Confirm no cancellation result card is committed.
- Confirm no new history entry is appended for the cancelled Equation run.
- Confirm replay substitution snapshots are not cleared by the cancelled run.
- Run a normal Equation symbolic request after cancellation and confirm it still commits normally.
- Run a normal Calculate/Table route after Equation cancellation and confirm their existing OOE behavior is unchanged.

## Internal/Diagnostic Checks

- Confirm the active OOE job for `equation.solve` reaches terminal `cancelled`.
- Confirm Equation OOE trace metadata records the cancellation stage/depth/phase when available.
- Confirm Equation OOE commit assessment is `notApplicable` for cancelled envelopes.
- Confirm diagnostics record terminal `cancelled` and do not store visible result/history payload changes for the cancelled run.

## Regression Boundaries

- Existing stale gates for Calculate, Equation, and Table remain unchanged.
- Table cancellation behavior from RS24/RS25 remains unchanged.
- Equation `Exact`, `Approximate`, and `Isolate` result behavior remains unchanged when not cancelled.
- Complex and inequality Equation result semantics remain unchanged.
