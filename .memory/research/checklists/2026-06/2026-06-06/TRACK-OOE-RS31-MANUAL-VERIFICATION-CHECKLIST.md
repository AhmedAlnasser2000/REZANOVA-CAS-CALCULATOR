# TRACK-OOE-RS31 Manual Verification Checklist

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- attribution_basis: live

## Scope

Verify `OOE-RS31: Shared Runtime Shell Contract And Launch-Ticket Widening`.

This checklist covers the shared runtime-shell evidence contract, the shared launch-ticket manager, active status readback, and Table adoption of pending History tickets. It does not migrate non-Equation/Table workspaces to workers, add solver capability, execute solvers in Rust, add public diagnostics, or rewrite the scheduler.

## Manual Checks

- Start an Equation worker job and confirm the display status changes away from `Ready` to active wording such as `Computing`, then returns after completion.
- Start a Table build and confirm the display status changes away from `Ready` while the job is pending.
- Open History during a running Equation job and confirm the pending row remains launch-order based with Stop available until completion/cancellation.
- Open History during a running Table build and confirm a pending Table row appears with input preview, running state, and Stop action.
- Stop a pending Table job and confirm the pending row is removed, the transient stopped status appears, and no fake completed History record is added.
- Complete a Table build and confirm the pending row is replaced by the finalized History entry in the same launch-order position.
- Start an Equation job, then a Table job, and confirm completed records preserve launch order rather than completion order.
- Confirm old completed History entries without launch-order keys keep their existing relative order after reload.

## Internal Checks

- Confirm `runtime-shell-contract` is a diagnostics/provenance contract only and does not own History ordering.
- Confirm `launch-tickets` owns ticket reservation, finalization/discard helpers, launch-order sorting, and running/stopping state.
- Confirm Equation RS30 behavior remains unchanged after extraction.
- Confirm Table OOE metadata/provenance carries normalized runtime-shell and launch-ticket evidence.
- Confirm the OOE diagnostics inspector shows normalized shell/ticket evidence for Equation and Table records.
- Confirm OOE boundary validation classifies the new OOE helper files as core-tier files.

## Deferred Workspace Checks

- Calculate standard remains existing active OOE main-thread behavior; no worker shell or History ticket adoption in RS31.
- Calculate workbench/algebra transform remains coarse provenance only.
- Editor analysis remains OOE budget lanes only and explicitly does not create History tickets.
- Advanced Calc, Trigonometry, Statistics, Geometry, Matrix, and Vector are audited for later adoption but not migrated in RS31.

## Regression Boundaries

- Equation `Exact`, `Approximate`, `Isolate`, complex, and inequality payloads remain unchanged.
- Table successful/stale behavior remains unchanged except for pending tickets and no fake cancellation records.
- Runtime shell contract and launch-ticket manager remain separate concepts in code, tests, and docs.
- No pending History ticket is persisted as a fake completed record.
- No result schema change, public OOE UI expansion, Rust solver execution, or new solver capability is introduced.
