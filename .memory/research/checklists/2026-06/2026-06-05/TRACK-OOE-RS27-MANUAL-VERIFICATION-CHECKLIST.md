# TRACK-OOE-RS27 Manual Verification Checklist

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- attribution_basis: live

## Scope

Verify `OOE-RS27: Equation Direct-Symbolic Helper Isolation Pilot`.

This checklist covers the isolated worker-backed terminal guarded `direct-symbolic` helper only. The top-level `equation.solve` OOE plan remains on `equation-runtime`; RS27 does not migrate the full Equation solver, execute solvers in Rust, add public diagnostics UI, change result/history schemas, or add solver capability.

## Manual Checks

- Run a normal Equation request that reaches supported guarded stages before `direct-symbolic` and confirm visible output is unchanged.
- Run a heavier unsupported/broad symbolic Equation request that reaches the terminal direct-symbolic fallback and confirm it still produces the same visible result as before RS27 when not stopped.
- Press `Stop` while a direct-symbolic helper run is active and confirm the header settles to the Equation-stopped transient status.
- Confirm cancelled direct-symbolic helper runs do not replace the previous visible Equation result.
- Confirm cancelled direct-symbolic helper runs do not append a history entry.
- Confirm cancelled direct-symbolic helper runs do not update `Ans`.
- Confirm cancelled direct-symbolic helper runs do not clear replay substitution snapshots.
- Run another normal Equation solve after cancellation and confirm it commits normally.

## Internal/Diagnostic Checks

- Confirm the active OOE job remains capability `equation.solve` on host `equation-runtime`.
- Confirm helper evidence records `equation-direct-symbolic-worker-runtime` for isolated direct-symbolic execution.
- Confirm worker unavailable or initialization failure records fallback evidence to `equation-runtime`.
- Confirm cancellation records hard-stop termination evidence and does not fallback to the main-thread helper.
- Confirm OOE diagnostics include direct-symbolic helper host evidence without storing new result/history schema fields.

## Regression Boundaries

- Existing RS26 guarded-stage cancellation checkpoints remain intact.
- Equation `Exact`, `Approximate`, and `Isolate` behavior remains unchanged when not cancelled.
- Complex and inequality Equation outputs remain unchanged.
- Calculate, Table, editor-analysis, and other OOE host descriptors remain unchanged except for adding the new helper host descriptor.
