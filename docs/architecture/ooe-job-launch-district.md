# OOE Job Launch District

Status: final split record

Purpose: group OOE job identity, active/recent job lifecycle, cancellation records, and history launch tickets outside the OOE root while preserving direct imports and traffic-control behavior.

## District Shape

- `src/lib/ooe/job-launch/job-contract.ts` owns deterministic input revision ids, job identities, commit contexts, latest-only commit assessment, and commit-legality helpers.
- `src/lib/ooe/job-launch/active-job-registry.ts` owns active/recent job records, cancellation requests, completion/failure/cancel transitions, and retention limits.
- `src/lib/ooe/job-launch/launch-tickets.ts` owns pending history ticket construction, stopping/discard helpers, launch ordering, and finalized/pending row sorting.

## Preserved Contracts

- Job ids and input revision ids remain deterministic for equivalent snapshots.
- Latest-only commit assessment, stale-drop behavior, and `commitAlways` handling are unchanged.
- Active and recent job retention, cancellation requester labels, and terminal status transitions are unchanged.
- Pending history tickets keep the same running/stopping/discard lifecycle and launch-order sort behavior.

## Consumers

App runtime hooks, history UI, editor/runtime control, mode runners, worker runtime tests, runtime coordinator, and diagnostics inspector now import the job launch district directly.

## Stop Rules

- Do not add root compatibility stubs for moved OOE internals.
- Do not change duplicate-launch behavior in this district.
- Do not change Display rendering policy, mode request ownership, runtime host identity, schemas, diagnostics wording, cancellation semantics, or replay/history contracts.
