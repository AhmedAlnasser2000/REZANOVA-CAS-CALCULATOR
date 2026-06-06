# TRACK-OOE-RS30 Manual Verification Checklist

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- attribution_basis: live

## Scope

Verify `OOE-RS30: Equation Worker Runtime Shell And History Tickets`.

This checklist covers the full Equation worker runtime-shell pilot plus transient History launch-order tickets. It does not add solver capability, non-Equation worker migration, Rust solver execution, public diagnostics expansion, an OOE scheduler rewrite, or fake persisted pending records.

## Manual Checks

- Start a heavy Equation solve and confirm the app remains responsive enough to scroll, switch modes, and open side surfaces while the solve is running.
- Open History during the running Equation job and confirm a pending Equation row appears immediately with the original input preview, running state, and Stop action.
- Start a quick job after the pending Equation job and confirm the pending Equation row keeps its launch-order position rather than being inserted by completion time.
- Let the Equation job complete and confirm the pending row is replaced by the final completed History entry in the same launch-order position.
- Switch away from Equation while the job is pending and confirm completion finalizes History without yanking the active workspace back to Equation.
- If the same Equation request is still active on completion, confirm the visible Equation result commits normally.
- Press Stop from the header or pending History row and confirm the worker is terminated, the transient stopped status appears, and no final History record is persisted for the cancelled job.
- Reload after completed jobs and confirm completed entries preserve launch-order sorting while legacy entries without launch order keep their existing relative order.

## Internal/Diagnostic Checks

- Confirm Rust host metadata includes `equation-worker-runtime` with `webWorker`, `workerSafe`, `isolated`, and `hardStop` policies.
- Confirm `plan.equation.solve` prefers `equation-worker-runtime` and keeps `equation-runtime` only as init/unavailable fallback.
- Confirm worker success payloads match the main-thread Equation payload shape.
- Confirm worker unavailable/init failure records fallback evidence to `equation-runtime`.
- Confirm worker runtime failure records controlled failure evidence without retrying on the main thread after the worker has started.
- Confirm cancellation marks the OOE envelope terminal `cancelled` with `notApplicable` commit assessment and preserves RS26/RS28 no-commit visible-state behavior.
- Confirm diagnostics/provenance include worker host, fallback/cancel evidence, ticket id/order key, and background-vs-visible commit assessment where available.

## Regression Boundaries

- Equation `Exact`, `Approximate`, `Isolate`, complex, and inequality payloads remain unchanged when not cancelled.
- Calculate, Table, editor-analysis, and other OOE lanes remain unchanged.
- Pending History tickets are transient UI state only; fake pending rows are not persisted.
- Result and history schemas are not changed beyond the optional launch-order key on completed history entries.
