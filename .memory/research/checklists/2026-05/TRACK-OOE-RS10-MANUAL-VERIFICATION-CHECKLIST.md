# TRACK-OOE-RS10 Manual Verification Checklist

status: completed
date: 2026-05-27
scope: OOE-RS10 boundary validator

## Code Checks

- [x] Added an OOE boundary validator core script.
- [x] Added a CLI validator entrypoint.
- [x] Added Node test coverage for accepted and rejected boundary cases.
- [x] Added `npm run test:ooe-boundaries`.
- [x] Wired the validator into `npm run test:gate`.

## Boundary Checks

- [x] Rust OOE production modules stay within local OOE, Rust std, and serde boundaries.
- [x] TypeScript OOE core files stay within OOE bridge/schema/helper boundaries.
- [x] TypeScript OOE pilot files can import only the explicit runtime seams they wrap.
- [x] UI, app-controller, Playground, source-mirror, `.memory`, Labs runner, tool-script, and broad solver/runtime imports are blocked.
- [x] No calculator runtime, result, history, UI, scheduler, cancellation, trace-buffer, MCP, or Rust solver behavior changed.

## Verification

- [x] `npm run test:ooe-boundaries`
- [x] `npm run test:unit -- src/lib/ooe/runtime-envelope.test.ts src/lib/ooe/equation-pilot.test.ts src/lib/ooe/expression-pilot.test.ts src/lib/ooe/table-pilot.test.ts`
- [x] `npm run test:memory-protocol`
- [x] `npm run lint`
- [x] `npm run build`
- [x] `cargo test --manifest-path src-tauri/Cargo.toml ooe`
- [x] `cargo check --manifest-path src-tauri/Cargo.toml`
