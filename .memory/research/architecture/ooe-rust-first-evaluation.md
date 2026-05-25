# OOE Rust-First Evaluation

status: architecture evaluation
created: 2026-05-24
source_context: `/home/ahmed/Downloads/ooe_rust_first_codex_handoff_v3 (1).md`
primary_agent: codex
primary_agent_model: gpt-5.5
attribution_basis: mixed

## Verdict

The OOE idea is a strong fit for Calcwiz, but only if it is treated as kernel execution-order infrastructure, not as a new solver family and not as UI orchestration.

The repo already has enough execution-order pressure to justify OOE:

- `src/lib/kernel/capabilities.ts` defines calculator capabilities such as `expression.evaluate`, `equation.solve`, and `table.build`.
- `src/lib/kernel/runtime-hosts.ts` defines runtime hosts such as `expression-runtime`, `equation-runtime`, and `table-runtime`.
- `src/lib/kernel/runtime-profile.ts` owns current budget/profile concepts for Equation and expression execution.
- `src/lib/kernel/runtime-policy.ts` owns stop/advisory classification such as invalid request, planner hard stop, range guard, and unsupported family.
- `src/lib/kernel/runtime-envelope.ts` attaches resolved input, planner badges, and runtime advisories to display outcomes.
- `src/lib/equation/guarded/run.ts` already has ordered stage descriptors, exact order validation, recursion, trace attempts, range guard, and re-entry protection.
- `src/lib/engine/math-engine.ts` already has an implicit expression lifecycle: canonicalization, `Ans` injection, parsing, angle/unit rewrite, discrete rewrite, symbolic normalization, calculus handling, numeric fallback, result guard, and final response shaping.

The missing piece is not another algebra engine. The missing piece is a central execution-order contract that can say which capability is being executed, which host owns it, which phases/stages are legal, what budget applies, whether a result is stable/failed/provisional, and what trace proves what happened.

## Fit Against Existing Architecture

OOE aligns with the current kernel-first boundary map:

- one runtime kernel
- many reusable algebra cores
- thin orchestrators
- thin adapters
- UI as presentation only

OOE should live in the kernel/runtime layer. It should know that an Equation plan has a stage-execute phase and that a guarded stage named `composition` exists, but it should not know how to solve composition equations.

The handoff's Rust-first direction is also consistent with the current Tauri/Rust long-term posture. A TypeScript-only OOE would be quick now but would create a migration trap if Rust later becomes the canonical runtime authority. The safer route is:

1. Rust owns serializable OOE schema and pure validation.
2. TypeScript continues executing existing hosts.
3. A thin bridge later asks Rust to validate plans or expose built-in plans.
4. Runtime pilots wrap existing behavior without changing math or UI.

## Important Correction

The handoff references a target repository name `REZANOVA-CAS-CALCULATOR`, but the current local Calcwiz checkout evaluated here is `/home/ahmed/Downloads/Calculator`, with `src-tauri/Cargo.toml` still pointing at `AhmedAlnasser2000/Cacluator`.

The local Rust layout is currently simple:

- `src-tauri/src/lib.rs`
- `src-tauri/src/main.rs`

There is no existing Rust module tree yet, so an OOE implementation should start with a dedicated `src-tauri/src/ooe/` module and wire it minimally through `lib.rs` only when the first Rust validation module is created.

## Boundaries

OOE must not become:

- a polynomial solver
- a composition inverter
- a trig solver
- a calculator UI controller
- a result renderer
- a second TypeScript microkernel
- a Playground runner
- a source-mirror executor
- a Progressive Solver implementation

OOE should order and validate execution. Math modules should perform math.

## Progressive And Atomic Solver Boundary

Progressive and atomic solver ideas are useful future concepts, but they should stay out of the first OOE gates.

Useful vocabulary to reserve:

- `atomic`: current production jobs that run to completion without chunking
- `progressive-ready`: future metadata for work that could later be chunked
- `checkpointable-ready`: future metadata for work that could later commit/resume chunks
- `progressive`: actual chunked execution, not implemented yet
- `checkpointable`: ledger-backed resumable execution, not implemented yet

The first OOE work may record task-class metadata, but it must not add:

- chunk scheduling
- checkpoint ledgers
- streamed partial UI
- resumable execution
- cancellation wiring through solvers
- remote execution routing
- background worker pools

## Recommended First Move

Do `OOE-RS0` first as architecture/readiness only, then `OOE-RS1` as the first Rust validation implementation.

Do not combine this with Progressive Solver, Equation refactors, or result-card UI changes.

## Evidence Files Reviewed

- `/home/ahmed/Downloads/ooe_rust_first_codex_handoff_v3 (1).md`
- `AGENTS.md`
- `.memory/PROTOCOL.md`
- `.memory/current-state.md`
- `docs/architecture/kernel-first-boundary-map.md`
- `package.json`
- `src-tauri/Cargo.toml`
- `src-tauri/src/lib.rs`
- `src/lib/kernel/capabilities.ts`
- `src/lib/kernel/runtime-hosts.ts`
- `src/lib/kernel/runtime-profile.ts`
- `src/lib/kernel/runtime-policy.ts`
- `src/lib/kernel/runtime-envelope.ts`
- `src/lib/equation/guarded/run.ts`
- `src/lib/engine/math-engine.ts`
- `src/types/calculator/runtime-profile-types.ts`
- `src/types/calculator/runtime-policy-types.ts`
- `src/types/calculator/display-types.ts`
