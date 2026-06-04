# TRACK-OOE-RS2 Manual Verification Checklist

Date: 2026-05-27
Milestone: `OOE-RS2`
Status: implemented locally

## Scope

- [x] Add a Rust built-in plan registry under `src-tauri/src/ooe/`.
- [x] Register one built-in OOE plan per current kernel capability.
- [x] Add lightweight descriptors with category, plan ID, capability ID, host ID, entrypoint, and description.
- [x] Keep built-in plans conservative: one explicit terminal node, stale-drop cancellation, latest-only commit, main-thread-only thread safety, draft stability, and no dependencies.
- [x] Validate all built-in plans through the RS1 pure validation path.
- [x] Do not add Tauri commands, TypeScript bridge code, runtime routing, scheduling, solver behavior, UI behavior, scheduler/cancellation behavior, trace buffer, MCP bridge, or Progressive Solver behavior.

## Verification

- [x] `cargo test --manifest-path src-tauri/Cargo.toml ooe`
- [x] `cargo check --manifest-path src-tauri/Cargo.toml`
- [x] `npm run test:memory-protocol`
- [x] `npm run lint`

## Manual Review

- [x] Built-in plan IDs are deterministic.
- [x] Built-in capability IDs mirror the current TypeScript kernel registry.
- [x] Built-in host IDs mirror the current TypeScript runtime-host registry.
- [x] Registry APIs remain pure Rust and behavior-neutral.

## Notes

- This checklist intentionally has no UI/manual calculator behavior checks because OOE-RS2 is an internal Rust registry only.
