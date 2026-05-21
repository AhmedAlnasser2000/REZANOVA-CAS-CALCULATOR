# TRACK-VEC-MAT-CORE0 Manual Verification Checklist

milestone: `VEC-MAT-CORE0`  
status: complete  
date: 2026-05-20  
primary_agent: codex  
primary_agent_model: gpt-5.5

## Scope

- Add separate reusable numeric Matrix and Vector cores.
- Keep Matrix and Vector product adapters stable.
- Add no exact rational scalars, symbolic matrix/vector CAS, new operations, UI redesign, or exact linear algebra.
- Update readiness so `vector-matrix-core` is `ready-with-adapter`.
- Keep exact linear algebra as `defer`.

## Manual Checks

- [x] Matrix core and Vector core are separate sibling modules, not one fused engine.
- [x] `src/lib/matrix.ts` delegates to Matrix core and preserves shipped output wording.
- [x] `src/lib/vector.ts` delegates to Vector core and preserves shipped output wording.
- [x] Direct core tests cover shape/dimension facts, operations, and typed stop reasons.
- [x] Product adapter tests still pass.
- [x] No exact linear algebra feature was added.

## Verification

- [x] `npm run test:unit -- src/lib/linear-algebra/matrix-core.test.ts src/lib/linear-algebra/vector-core.test.ts src/lib/matrix.test.ts src/lib/vector.test.ts src/lib/linear-algebra-workbench.test.ts src/lib/algebra/capability-readiness.test.ts`
- [x] `npm run test:memory-protocol`
- [x] `npm run lint`
- [x] `npm run build`
- [x] `npm run test:golden`
- [x] `npm run test:ui`
- [x] `cargo check --manifest-path src-tauri/Cargo.toml`
