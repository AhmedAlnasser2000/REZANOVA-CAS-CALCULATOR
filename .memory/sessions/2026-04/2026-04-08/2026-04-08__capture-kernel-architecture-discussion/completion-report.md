# Kernel Architecture Discussion Capture

## Attribution
- primary_agent: codex
- primary_agent_model: gpt-5.4
- contributors:
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.4
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.4
- attribution_basis: historical-user-confirmed

- Task: capture the kernel / microkernel / pillars architecture discussion accurately in durable memory
- Status: completed
- Scope:
  - reviewed the external local pack `<local-source>\calcwiz_kernel_architecture.zip`
  - preserved the pack structure and main claims in repo memory instead of reducing it to a short summary
  - recorded the Calcwiz-specific adaptation:
    - kernel-centered modular monolith first
    - microkernel/plugin platform later
    - internal extensibility now
    - external extensibility later
    - Rust-authoritative runtime as a long-term destination, not an immediate implementation mandate
  - anchored the recommendation in current repo evidence:
    - `src/lib/math-engine.ts`
    - `src/lib/equation/guarded/run.ts`
    - `src/types/calculator/runtime-types.ts`
    - `src/app/logic/modeActionHandlers.ts`
    - recent shared cores such as `src/lib/algebra/polynomial-core.ts`, `src/lib/algebra/polynomial-factor-solve.ts`, and `src/lib/algebra/radical-core.ts`
  - updated durable memory surfaces:
    - `.memory/research/architecture/kernel-architecture-notes.md`
    - `.memory/research/references/sources.md`
    - `.memory/decisions.md`
    - `.memory/open-questions.md`
    - `.memory/current-state.md`
    - `.memory/journal/2026-04/2026-04-08.md`
- Important caution preserved:
  - this is an architecture direction and planning capture, not a locked implementation roadmap or an instruction to begin a full plugin platform immediately
