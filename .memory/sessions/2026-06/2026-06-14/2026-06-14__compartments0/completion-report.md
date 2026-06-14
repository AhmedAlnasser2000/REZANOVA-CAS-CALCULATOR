# COMPARTMENTS0 Completion Report

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5
- contributors:
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5
- attribution_basis: live

## Task Goal

Document the first Supercarrier compartment contract over the current Calcwiz districts without adding runtime machinery.

## What Changed

- Added `docs/architecture/supercarrier/compartment-contracts.md`.
- Defined the standing separation between OOE, OOE event outbox, Supercarrier compartments, and future Surface Protocol.
- Cataloged initial compartments across app shell, app runtime, OOE, Display, workspaces/modes, Algebra, Symbolic Engine, Engine, Guide, Labs, Playground, and Source Mirrors.
- Recorded contract fields, dependency policy, event/diagnostics policy, Surface Protocol boundary, future `COMPARTMENTS1` validator readiness, and stop rules.
- Updated docs indexes and the OOE event-outbox/Supercarrier sequencing handoff.

## Boundaries

- Docs/memory only.
- No source import changes, runtime registry, validator, event emission change, OOE behavior change, solver behavior change, Display policy change, schema change, worker-host change, CSS change, Surface Protocol, plugin API, SDK, reducer, or remote-compute protocol.

## Verification

- Verification commands are recorded in `verification-summary.md`.

## Commits

- Same-commit milestone: COMPARTMENTS0.
