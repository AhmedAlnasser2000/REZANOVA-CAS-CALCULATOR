# OOE Bridge Schema District

Status: final split record

Purpose: group OOE bridge schemas, built-in plan/host descriptor access, desktop bridge availability checks, validation reports, commit assessment contracts, and trace schemas outside the OOE root while preserving TypeScript/Rust parity assumptions.

## District Shape

- `src/lib/ooe/bridge-schema/ooe-bridge.ts` owns OOE schema definitions, zod validation, built-in host/plan lookups, desktop bridge fallback handling, commit-assessment contracts, job identity schema, and trace event schema.
- `src/lib/ooe/bridge-schema/ooe-bridge.test.ts` keeps direct schema and bridge compatibility coverage against the moved district entrypoint.

## Preserved Contracts

- Schema names, TypeScript exported type names, descriptor field names, validation report shape, and bridge fallback reasons are unchanged.
- Capability ids, host ids, plan ids, node ids, phase ids, task classes, commit policies, cancellation policies, and trace fields are unchanged.
- Runtime-control, job-launch, diagnostics, pilots, mode workers, and diagnostics UI tests import the bridge schema district directly.
- Rust/Tauri descriptor parity remains an adjacent contract; this split does not edit Rust/Tauri files.

## Stop Rules

- Do not add root compatibility stubs for moved OOE internals.
- Do not change schema wire shapes, descriptor ids, validation wording, fallback behavior, commit assessment behavior, runtime host identity, diagnostics wording, duplicate-launch policy, Rust/Tauri registry behavior, or replay/history contracts.
