# Geometry Runtime Shell And Seed Readiness Handoff

## Attribution
- primary_agent: codex
- primary_agent_model: gpt-5.5
- attribution_basis: live

## Summary

Geometry remains a valid visible workspace, but it should not receive OOE runtime-shell or launch-ticket adoption in the current Trigonometry cleanup sequence. It is cleaner than old Trigonometry from a product-boundary perspective: Geometry is not visibly trying to be a second Equation or Calculate workspace. Its risk is different: the request, replay, and history payloads need a stronger typed contract before pending launch tickets can honestly reserve and finalize History rows.

This handoff belongs beside `TRIGONOMETRY-PERIOD-PHASE1 + TRIGONOMETRY-RUNTIME-SEED1`: Trigonometry receives the new Period & Phase workflow and typed replay seed now; Geometry is audit-only and deferred.

## Current Assessment

- Geometry has a coherent user-facing experience around geometry-specific formulas, coordinate workflows, and bounded solve-missing helpers.
- Geometry helper modules should remain reusable capabilities, but the visible workspace does not currently have the same redundancy problem that Trigonometry had with `Functions`, `Equations`, and `Special Angles`.
- OOE widening should wait until Geometry requests and History replay are made explicit enough to support worker snapshots, cancellation evidence, stale gates, and pending launch tickets.
- Launch tickets would be premature if completed Geometry records cannot fully restore the launched request rather than merely showing a saved result card.

## Deferred Sequence

1. `GEOMETRY-BOUNDARY0`
   - Reconfirm visible Geometry experience boundaries and identify any overlap with Equation, Calculate, or future graphing.

2. `GEOMETRY-REQUEST1`
   - Normalize Geometry request shapes into a typed launch/replay contract.
   - Make request snapshots cloneable and independent from live UI state.

3. `GEOMETRY-HISTORY1`
   - Persist typed Geometry replay seeds for new records.
   - Keep legacy seedless records loadable.

4. `GEOMETRY-OOE-PILOT1`
   - Add OOE provenance/diagnostics around the existing main-thread Geometry execution path without worker migration.

5. `GEOMETRY-RUNTIME-SHELL1`
   - Move Geometry to a worker runtime shell and launch tickets after typed request/history contracts are stable.

## Boundaries

- Do not add Geometry OOE shell/tickets during `TRIGONOMETRY-PERIOD-PHASE1 + TRIGONOMETRY-RUNTIME-SEED1`.
- Do not rewrite Geometry product taxonomy as part of the Trigonometry milestone.
- Do not delete Geometry helper modules; future cleanup should separate reusable capabilities from workspace experience rather than removing shared cores.
- Do not persist fake History records for pending Geometry work until typed seeds exist.

## Outcome

Geometry is deferred deliberately, not forgotten. The next safe Geometry move is request/history contract hardening, not runtime migration.
