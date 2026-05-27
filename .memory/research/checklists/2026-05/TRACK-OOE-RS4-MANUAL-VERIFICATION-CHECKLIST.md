# TRACK-OOE-RS4 Manual Verification Checklist

Date: 2026-05-27
Milestone: `OOE-RS4`
Status: implemented locally

## Scope

- [x] Add a TypeScript OOE bridge module.
- [x] Mirror Rust OOE plan, node, descriptor, trace-event, validation-error, and validation-report wire types for adapter convenience.
- [x] Add zod schemas for Rust serde wire shapes.
- [x] Add `isOoeBridgeAvailable`.
- [x] Add `listBuiltinOoePlanDescriptors`.
- [x] Add `getBuiltinOoePlan`.
- [x] Add `validateOoePlan`.
- [x] Return explicit unavailable results with safe fallback data outside Tauri.
- [x] Keep Rust canonical and avoid a TypeScript OOE registry or validator.
- [x] Do not add UI consumers, runtime routing, scheduler/cancellation behavior, solver execution, trace buffer, MCP bridge, history schema changes, or result schema changes.

## Verification

- [x] `npm run test:unit -- src/lib/ooe/ooe-bridge.test.ts`
- [x] `cargo test --manifest-path src-tauri/Cargo.toml ooe`
- [x] `cargo check --manifest-path src-tauri/Cargo.toml`
- [x] `npm run test:memory-protocol`
- [x] `npm run lint`
- [x] `npm run build`

## Manual Review

- [x] Command names match the RS3 Tauri commands exactly.
- [x] Web preview does not claim canonical OOE data.
- [x] `OOE-RS5` remains the first possible guarded Equation runtime pilot.
