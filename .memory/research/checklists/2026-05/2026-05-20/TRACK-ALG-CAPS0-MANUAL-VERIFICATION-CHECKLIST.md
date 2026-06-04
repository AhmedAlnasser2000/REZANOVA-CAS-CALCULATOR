# TRACK-ALG-CAPS0 Manual Verification Checklist

milestone: `ALG-CAPS0`  
status: complete  
date: 2026-05-20  
primary_agent: codex  
primary_agent_model: gpt-5.5

## Scope

- Add a tiny internal readiness registry for math substrates.
- Keep runtime `kernel/capabilities` as execution-seam metadata only.
- Add no math behavior, UI behavior, parser behavior, solver behavior, result origins, or badges.
- Set the next sequence to `ALG-CAPS0 -> VEC-MAT-CORE0 -> POLY-CORE-AUDIT1 -> INT-CANDIDATE2`.

## Manual Checks

- [x] `src/lib/algebra/capability-readiness.ts` exists and is separate from `src/lib/kernel/capabilities.ts`.
- [x] Readiness statuses are limited to `ready`, `ready-with-adapter`, `blocked`, and `defer`.
- [x] Vector/matrix core is marked `blocked` until `VEC-MAT-CORE0`.
- [x] Exact linear algebra is marked `defer` until vector/matrix core and exact scalar readiness exist.
- [x] Runtime kernel capability tests still cover only execution seams.
- [x] Memory records `VEC-MAT-CORE0` as the next recommended milestone.

## Verification

- [x] `npm run test:unit -- src/lib/algebra/capability-readiness.test.ts src/lib/kernel/capabilities.test.ts src/lib/algebra/polynomial-core.test.ts src/lib/algebra/domain-range-core.test.ts src/lib/calculus/calculus-core.test.ts src/lib/linear-algebra/matrix.test.ts src/lib/linear-algebra/vector.test.ts`
- [x] `npm run test:memory-protocol`
- [x] `npm run lint`
- [x] `npm run build`
- [x] `npm run test:golden`
- [x] `npm run test:ui`
- [x] `cargo check --manifest-path src-tauri/Cargo.toml`
