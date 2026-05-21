# TRACK-VEC-MAT-AUDIT0 Manual Verification Checklist

milestone: `VEC-MAT-AUDIT0`  
status: complete  
date: 2026-05-20  
primary_agent: codex  
primary_agent_model: gpt-5.5

## Scope

- Confirm Matrix and Vector are numeric product workspaces, not reusable algebra cores.
- Add focused shipped-behavior tests for current numeric Matrix/Vector operations and stop messages.
- Record that exact linear algebra remains postponed behind a future reusable core boundary.
- Do not add Matrix/Vector capability.

## Manual Checks

- [x] Existing FriCAS/context-roadmap work committed first as `f18d895`.
- [x] Matrix audit records current numeric operations, request/response shape, notation helper role, and missing exact-core pieces.
- [x] Vector audit records current numeric operations, request/response shape, notation helper role, and missing exact-core pieces.
- [x] Tests cover current numeric Matrix operations and stop cases.
- [x] Tests cover current numeric Vector operations and stop cases.
- [x] `MATRIX-EXACT0` remains deferred behind `VEC-MAT-CORE0`.
- [x] No product Matrix/Vector behavior, UI, solver, calculus, polynomial, or equation behavior changed.

## Verification

- `npm run test:unit -- src/lib/matrix.test.ts src/lib/vector.test.ts src/lib/linear-algebra-workbench.test.ts`
- `npm run test:memory-protocol`
- `npm run lint`
- `npm run build`
- Optional broader checks when time allows:
  - `npm run test:golden`
  - `npm run test:ui`
  - `cargo check --manifest-path src-tauri/Cargo.toml`
