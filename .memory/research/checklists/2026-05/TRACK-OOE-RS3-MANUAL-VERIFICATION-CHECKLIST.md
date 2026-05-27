# TRACK-OOE-RS3 Manual Verification Checklist

Date: 2026-05-27
Milestone: `OOE-RS3`
Status: implemented locally

## Scope

- [x] Add narrow Tauri command wrappers under `src-tauri/src/ooe/commands.rs`.
- [x] Add `OoeValidationReport` for validation results.
- [x] Add `ooe_list_builtin_plans`.
- [x] Add `ooe_get_builtin_plan`.
- [x] Add `ooe_validate_plan`.
- [x] Wire the OOE commands into `tauri::generate_handler!`.
- [x] Keep invalid plans as validation-report data, not command failures.
- [x] Keep unknown built-in plan lookup as `None`/`null`.
- [x] Do not add frontend invoke wrappers, runtime routing, scheduler/cancellation behavior, solver behavior, UI behavior, trace buffer, MCP bridge, or Progressive Solver behavior.

## Verification

- [x] `cargo test --manifest-path src-tauri/Cargo.toml ooe`
- [x] `cargo check --manifest-path src-tauri/Cargo.toml`
- [x] `npm run test:memory-protocol`
- [x] `npm run lint`

## Manual Review

- [x] Command bodies are thin wrappers over pure helpers.
- [x] The command bridge exposes OOE data but is not called by calculator runtime paths.
- [x] RS4 remains the first TypeScript bridge milestone.

## Notes

- This checklist intentionally has no UI/manual calculator behavior checks because OOE-RS3 exposes diagnostics commands only.
