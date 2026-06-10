# GEOMETRY-BOUNDARY0: Geometry Workspace Boundary Audit

status: completed
date: 2026-06-10
primary_agent: codex
primary_agent_model: gpt-5.5
attribution_basis: live

## Summary

`GEOMETRY-BOUNDARY0` confirms that Geometry should remain a visible workspace, but it should not receive OOE runtime-shell or launch-ticket adoption yet. Unlike old Trigonometry, Geometry is not visibly acting as a second Calculate or Equation workspace. Its current surface is already a geometry-specific experience around shapes, solids, coordinate measures, and bounded solve-missing forms.

The blocker is not product redundancy. The blocker is launch contract maturity: Geometry has a useful internal `GeometryRequest` union, but completed History entries still mainly persist `geometryScreen` rather than a full typed replay seed. That is not enough for honest launch tickets, worker snapshots, stale gates, diagnostics, or background completion semantics.

## Current Surface Inventory

The visible Geometry home currently groups workflows into:

- `2D Shapes`: square and rectangle formula workflows.
- `3D Solids`: cube, cuboid, cylinder, cone, and sphere formula workflows.
- `Triangles`: triangle area and Heron workflows.
- `Circles`: circle plus arc/sector workflows.
- `Coordinate Geometry`: distance, midpoint, slope, and line-equation workflows.

This shape is coherent enough to keep. It describes a guided geometry workspace rather than a generic expression evaluator.

## Boundary Decision

Geometry should own:

- geometric-object setup;
- shape, solid, circle, sector, triangle, and coordinate-measure workflows;
- geometry-specific solve-missing flows where the unknown is attached to a geometric object or measurement;
- readable geometry facts, assumptions, and warnings tied to those objects;
- future construction/measurement workflows after a separate request/history hardening pass.

Geometry should not own:

- broad algebraic equation solving, which belongs to Equation;
- quick scalar expression evaluation, which belongs to Calculate;
- trigonometric triangle relation workflows such as sine-rule/cosine-rule/right-triangle solving, which stay in Trigonometry;
- graphing, dynamic scenes, CAD-like construction, or theorem-proof work in this milestone;
- OOE runtime-shell/ticket adoption before typed request and History seed cleanup.

## Capability Ownership

Geometry helper modules should remain reusable capability code. The workspace is the experience layer, not the only owner of algebra, square roots, scalar math, readback, or validity facts.

The existing `GeometryRequest` union is the right seed for future cleanup. It already describes structured forms such as square, circle, arc/sector, coordinate, and solve-missing requests. `GEOMETRY-REQUEST1` should make that request shape the canonical launch and replay snapshot.

## Request And History Gap

Current completed History entries can carry `geometryScreen`, but they do not yet persist a full typed geometry request seed. Guide examples have partial geometry seed data, but that is not the same as a completed History replay contract.

This means pending History tickets would be premature. A pending row should be able to finalize into a record that can replay the exact launched geometry workflow. Today that guarantee is not strong enough for every Geometry route.

The next safe contract is:

```ts
geometrySeed: {
  screen: GeometryScreen;
  request: GeometryRequest;
}
```

New records should prefer `geometrySeed`, while legacy `geometryScreen` records remain loadable by reparsing `inputLatex`.

2026-06-10 update: `GEOMETRY-REQUEST1 + GEOMETRY-HISTORY1` implemented this contract for completed Geometry history records. The audit's request/history blocker is closed, but OOE launch tickets and worker-shell adoption remain deferred to `GEOMETRY-OOE-PILOT1` and `GEOMETRY-RUNTIME-SHELL1`.

## OOE Readiness

Geometry already has a main-thread/provenance-style OOE lane through `geometry.evaluate` / `geometry-runtime`. That is appropriate for now.

Worker shell and launch-ticket adoption should wait for:

1. typed request canonicalization;
2. typed completed History seeds;
3. a main-thread OOE pilot with clear Geometry diagnostics;
4. worker-safety review of Geometry internals, including module-level symbolic/ComputeEngine state.

## Locked Sequence

The Geometry sequence stays:

1. `GEOMETRY-BOUNDARY0`
2. `GEOMETRY-REQUEST1`
3. `GEOMETRY-HISTORY1`
4. `GEOMETRY-OOE-PILOT1`
5. `GEOMETRY-RUNTIME-SHELL1`

## Non-Goals

- No Geometry UI removal.
- No solver capability change.
- No history schema change.
- No OOE runtime shell.
- No launch tickets.
- No Rust solver execution.
- No graphing or scene runtime.
- No broad repository refactor.

## Recommendation

Do `GEOMETRY-REQUEST1` next if Geometry remains the active lane. It should turn the existing request union into a canonical launch/replay shape before any OOE widening. That keeps the future Geometry runtime shell independent of solver complexity and avoids the same stale-snapshot/history-ticket problems that appeared when MathLive-backed workspaces were widened too quickly.
