# OOE Resource Breaker Prerequisite Audit 0

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.6
- primary_agent_family: sol
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.6
- recorded_by_agent_family: sol
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.6
- verified_by_agent_family: sol
- attribution_basis: live

## Status

- Research and boundary audit only.
- Breaker implementation is blocked until repository CI is green and the user explicitly activates a dedicated implementation milestone.
- No OOE, Table, worker, resource schema, or computational-cap change is authorized by this audit.

## Locked Architecture

- OOE remains the sole execution authority and compute traffic controller. Resource protection belongs beneath OOE, not beside it.
- Algorithms may report structured complexity and pressure evidence; OOE decides resource policy, escalation, host containment, commit/drop legality, and final outcome classification.
- Mathematical and representation caps remain intact. They protect mathematical meaning, supported scope, proof validity, or bounded representation and are not breaker migration candidates.
- Only engineering-safety caps and explicitly temporary development caps may become migration candidates after a per-cap inventory and review.
- The intended escalation vocabulary is `pressure -> soft stop -> isolated-host hard stop`.
- A partial computation must never be committed or displayed as a completed result.
- Resource stops are operational outcomes. They remain distinct from mathematical impossibility, unsupported mathematics, and proof failure.

## Live Table Audit

Source inspected: `src/lib/modes/worker-clients/table-worker-client.ts`.

- A Stop request terminates `table-worker-runtime` and returns a controlled `worker-cancelled` result with isolated `hardStop` host evidence.
- The existing compatibility path intentionally retries on the non-isolated main-thread `table-runtime` when the worker is unavailable or cannot initialize.
- After a worker is created, invalid completed outcomes, worker-reported failure, worker error, startup timeout, and `postMessage` failure terminate the worker and currently retry through the same non-isolated fallback.
- A future failure taxonomy may retain explicitly reviewed startup or compatibility fallbacks where isolation was never established or the platform lacks Worker support.
- A future resource soft stop, resource hard stop, resource-pressure unresponsiveness, or resource-limit termination must never retry the same computation on a less-isolated host. Doing so would erase containment precisely when containment is required.

## Prerequisites Before Implementation

1. Green CI and explicit user activation.
2. Inventory every current compute cap and classify it as mathematical, representation, engineering-safety, or temporary-development.
3. Define structured resource-pressure and resource-stop outcomes without conflating them with solver errors.
4. Define host escalation and non-fallback rules, including the reviewed Table compatibility exceptions.
5. Define cancellation, stale-result, History, diagnostics, and partial-result laws before changing runtime behavior.
6. Prove that existing workers, hosts, capability IDs, replay seeds, and OOE ownership remain distinct.

## Open Decision

- The exact boundary between a recoverable Table startup/compatibility failure and a non-retryable resource/containment failure requires a dedicated reviewed taxonomy. This audit does not choose or implement that schema.
