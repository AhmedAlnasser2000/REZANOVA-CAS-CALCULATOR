# OOE Pilot Surface Grouping

Status: complete

Purpose: record the `OOE-PILOT-SURFACE-GROUPING1` tree-declutter milestone. The grouping moved OOE pilot adapters out of the `src/lib/ooe/` root and into `src/lib/ooe/pilots/` without changing runtime behavior or keeping root compatibility stubs.

## Final Pilot Home

- Production pilots live in `src/lib/ooe/pilots/`.
- Direct pilot tests live beside the grouped pilots and continue to exercise the public pilot contracts.
- OOE traffic-control core files remain at the `src/lib/ooe/` root.

## Responsibility Boundary

- Pilots bridge existing mode runtimes to OOE metadata, provenance, host evidence, and diagnostics.
- Pilots do not own solver logic, Display render policy, workspace product identity, duplicate-launch policy, or traffic-control schemas.
- Modes and worker clients import pilot contracts directly from `src/lib/ooe/pilots/`.

## Preserved Contracts

- Host ids, fallback ids, capability ids, plan ids, node ids, phase ids, runtime shell evidence, provenance, trace wording, cancellation behavior, stale-gate behavior, diagnostics wording, schemas, replay/history contracts, and reserved-symbol behavior stayed unchanged.
- Matrix and Vector remain distinct capabilities and product surfaces while sharing the current linear-algebra runtime host.
- Geometry remains in its current pilot/runtime state; this grouping does not start Geometry runtime-shell adoption.

## Follow-Ups

- Audit the remaining traffic-control core before any root district split.
- Keep duplicate-launch/rerun policy as a future behavior milestone, not as part of path grouping.
