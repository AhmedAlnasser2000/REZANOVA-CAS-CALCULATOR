# Calcwiz Agent Policy

## Authority And Read Order
- `AGENTS.md` is the authoritative workflow and agent-governance file for this repository.
- `CLAUDE.md` and `GEMINI.md` are compatibility stubs only; they must defer to `AGENTS.md` and must not define competing policy.
- Before substantial work, every agent must read in this order:
  - `AGENTS.md`
  - `.memory/PROTOCOL.md`
  - `.memory/current-state.md`
  - the active `.memory/sessions/<task-id>/...` dossier when one exists
- If any workflow or memory file conflicts with `AGENTS.md`, follow `AGENTS.md` and update the lower-priority file afterward.

## Memory Policy
- After finishing any task that changes code, architecture, tooling, UX behavior, or project workflow, append a concise dated note to `.memory/journal/YYYY-MM-DD.md` before sending the final response.
- If the task locks in a durable product or engineering decision, also append a dated bullet to `.memory/decisions.md`.
- If the task leaves an unresolved design or roadmap choice, append a dated bullet to `.memory/open-questions.md`.
- Durable memory under `.memory/` is expected to be tracked in git; temporary task tracking belongs in `.task_tmp/` and must stay ignored.
- Update `.memory/current-state.md` and the active `.memory/sessions/<task-id>/...` dossier whenever a meaningful task or verified gate completes.
- Memory completeness is a commit gate for meaningful work: before committing code, tooling, UX, architecture, or workflow changes, either stage the required durable-memory updates or record a short explicit reason in the active session/verification note explaining why no durable memory update was required.
- Do not mark a milestone complete when `.memory/current-state.md`, `.memory/decisions.md`, session dossier, or journal updates required by the change are missing.
- `.memory/current-state.md` is a current operating snapshot, not an append-only milestone log. The memory-protocol validator enforces this and the gate fails if any rule is broken:
  - Keep it under the 500-line protocol cap and at most 14 level-2 (`##`) headings.
  - No milestone-id headings (e.g. `## OOE-RS12`, `## DISPLAY-SCHEDULER-POLISH1`); finished-milestone records belong in the journal, `.memory/decisions.md`, session dossiers, or the `.memory/research/milestones/` archive.
  - Refresh the `Last updated: YYYY-MM-DD` line on every meaningful update.
- Daily current-state catch-up is mandatory: if a journal or session dossier exists for a newer date than `.memory/current-state.md`, `npm run test:memory-protocol` fails. Before committing the first meaningful work of a new day, refresh `.memory/current-state.md` so it reflects the current repo posture for that day.
- When updating `.memory/current-state.md`, **replace or trim superseded postures in place rather than appending**. When a section grows stale or the file nears the cap, move the oldest superseded content into the current month's `.memory/research/milestones/current-state-milestone-archive-YYYY-MM.md` (create the monthly file if absent) — never let history accumulate in the snapshot.
- Keep memory updates short, factual, and human-readable. Prefer bullets.
- Do not make runtime behavior depend on `.memory/`.
- If `.memory/` is missing, recreate the existing structure before writing notes.
- Follow `.memory/PROTOCOL.md` for the durable-memory schema, attribution fields, journal format, and handoff rules.

## Agent Attribution Policy
- Every durable memory artifact for a meaningful task or verified gate must record ownership and provenance.
- Required durable-memory fields are defined in `.memory/PROTOCOL.md`, including:
  - `primary_agent`
  - `primary_agent_model`
  - `primary_agent_family`
  - `recorded_by_agent`
  - `recorded_by_agent_model`
  - `recorded_by_agent_family`
  - `verified_by_agent`
  - `verified_by_agent_model`
  - `verified_by_agent_family`
  - `attribution_basis`
- Add `contributors`, `committed_by_agent`, `committed_by_agent_model`, and `committed_by_agent_family` when they materially apply.
- Allowed agent-family values are lowercase `sol`, `terra`, and `luna`.
- Family fields are prospective from `2026-07-09`. Do not infer or backfill a family for older artifacts.
- The user-confirmed attribution correction maps exact model-field values `gpt-5` and `gpt-5-codex` to `gpt-5.5`. Explicit `gpt-5.4`, `gpt-5.3-codex`, and lower/versioned historical values are protected and must not be rewritten by that correction.
- `primary_agent` means milestone owner, not merely the last editor.
- If an agent only updates memory, verification, or commit metadata, do not overwrite `primary_agent`.
- Every cross-agent handoff must be recorded in durable memory with a short dated note in the active session dossier.

## Workflow Policy
- Default workflow is commit-first, not worktree-first.
- Commit after each meaningful verified gate instead of after every tiny edit.
- When a milestone is sliced internally, treat slices as gates/checkpoints first, not automatic commit boundaries. Verify each slice, record evidence, and keep the final commit aligned to the user-approved milestone or explicitly requested commit split.
- Do not create alphabet-suffix commits such as `MILESTONE1a`, `MILESTONE1b`, or `MILESTONE1c` unless the user explicitly requested separate commits for those slices. Prefer one commit for one named milestone after all slice gates pass.
- Keep explicit user approval before `git commit` and `git push`.
- When a task is being committed, update session commit metadata as part of that same checkpoint whenever possible; do not create a second metadata-only commit just to record the hash unless recovery is unavoidable.
- Before any commit for meaningful work, verify the staged diff includes the expected durable-memory updates or an explicit no-memory-needed note. Do not rely on a later cleanup agent to reconstruct decisions from git history.
- Use `.task_tmp/<task-id>/` for multi-step or UI-heavy tasks that need gate notes, verification logs, or recovery artifacts.
- Label gates as `ui` or `backend` and record verification evidence before considering them complete.
- Worktrees or extra branches are exceptions for parallel isolation, risky rewrites, or recovery scenarios; they are not the default model for this repo.
- Do not make runtime behavior depend on workflow artifacts in `.task_tmp/`, `docs/checkpoints/`, or `.memory/`.
- Every meaningful gate must be labeled `ui` or `backend`.
- Every verified gate must record evidence before commit.
- Every completed task handoff must list which durable memory files were updated.
- Follow `docs/workflow/commit-first-gates.md` for the detailed gate contract and wrong-branch recovery procedure.

## Visual Output Verification Policy
- For any task that changes, validates, benchmarks, or discusses app-visible mathematical output, agents must use Playwright to inspect the real app output visually before calling the gate complete.
- Unit tests, engine tests, and DOM assertions are necessary but not sufficient for app-visible output gates. They may support the work, but they do not replace Playwright visual verification.
- Playwright evidence must cover the rendered answer/error card, visible facts or assumptions, relevant detail/boundary cards, and obvious overflow/readability problems for the changed or benchmarked surface.
- If Playwright cannot run, the agent must record the blocker, the command attempted, and the missing visual risk in the active session dossier and final handoff. Do not present the output as visually verified.

## Resource-Safe Verification Policy
- After an ordinary implementation or repair, run only the affected tests and relevant contract ratchets. Do not substitute the full unit, UI, or canary suite for impact analysis.
- Before a milestone commit, use focused workspace tests, incremental TypeScript, memory validation, file-size validation, and diff hygiene. Add broader gates only when the milestone's actual blast radius requires them.
- Run complete unit, UI, or canary suites only at a major program closeout, release preparation, or after a genuinely cross-cutting change invalidates broad evidence. `npm run test:gate` is a closeout-scale command, not a routine per-edit gate.
- Any necessary full Vitest run must use at most four workers, run without another heavy gate concurrently, and be announced to the user before launch. The repository Vitest configs and full-suite scripts must retain this four-worker cap.
- A small correction after a successful full run invalidates only its affected evidence when it does not change shared runtime contracts, worker topology, global test infrastructure, or broad behavior. Run targeted regression tests and record that delta; never restart the entire suite automatically.
- A lost terminal transcript, interrupted reporter, or uncertainty about a still-running process is not automatic permission to rerun a full suite. Inspect process state and retained evidence first; if a new full run is still necessary, explain why before starting it.
- Stop orphaned Vitest, Playwright, preview, or dev-server processes when their evidence is complete. Do not leave heavy verification running across a handoff or final response.

## File-Size Ratchet Policy
- `tools/validate-file-sizes.mjs` is a hard anti-regrowth gate for TypeScript source files.
- The default cap is 1,000 lines for production TypeScript and 1,500 lines for test files (`*.test.*`, `*.spec.*`, and files under `__tests__/`). Existing committed baseline entries above the applicable default remain exact caps.
- Baseline caps must ratchet to the current line count after slimming; do not add percentage headroom or soft buffers.
- A file may exceed the default cap only through an existing baseline entry or a deliberate reviewed baseline edit.
- When a large file shrinks, run `node tools/validate-file-sizes.mjs --update-baseline` so the cap lowers in the same change.
- Do not bypass the ratchet by moving active code into generated-looking files or excluded paths unless the milestone explicitly creates generated output.

## Architecture Drift Guardrails
- Do not turn cleanup, slimming, deduplication, or glue extraction into a new architecture unless the milestone explicitly asks for it.
- Before implementing or widening a nontrivial algorithm, declare the prerequisite infrastructure and logic it depends on, such as representation, symbolic primitives, facts/assumptions, validation, route evidence, readback/presentation, and tests. Those prerequisites must already exist, be built in a prior milestone, or be built in parallel inside the same approved milestone. If a prerequisite is missing, stop and document the gap instead of embedding route-local mini-infrastructure that later algorithms will duplicate.
- Shared helpers may remove duplicated wiring, but they must not merge independently owned workers, hosts, capabilities, solvers, seeds, replay contracts, or user-facing workspace responsibilities.
- The locked runtime-shell model is: one shared OOE contract, multiple per-workspace shells. A generic helper may file the shared paperwork, but each workspace keeps its own host descriptor, capability IDs, request shape, result handler, fallback host, diagnostics evidence, and replay seed.
- Do not collapse runtime hosts such as `equation-worker-runtime`, `calculate-worker-runtime`, `geometry-worker-runtime`, `trigonometry-worker-runtime`, `statistics-worker-runtime`, `calculus-worker-runtime`, `table-worker-runtime`, or `linear-algebra-worker-runtime` into one generic worker unless a dedicated architecture milestone explicitly reverses the model.
- Do not rename, merge, or broaden capability IDs while refactoring glue. Capability identity is product/runtime contract, not boilerplate.
- OOE remains the compute traffic controller: launch, host selection, cancellation, stale gates, commit/drop legality, diagnostics, and history tickets. Display render policy, workspace taxonomy, solver math, and future external protocols must not be smuggled into OOE refactors.
- Do not implement future roadmap concepts unless explicitly in scope and already grounded in repo code. This includes Surface Protocol, Supercarrier compartments, public SDKs, plugin systems, remote compute protocols, broad event buses, and Progressive Solver.
- Before extracting a shared helper, verify the duplicated code is truly the same ritual with different configuration. If any lane has different stale semantics, cancellation behavior, history finalization, replay payload, worker lifecycle, or visible commit rule, preserve that difference explicitly.
- Behavior-invisible refactors must prove invisibility with tests or focused evidence: same worker host, same capability id, same request snapshot, same stale/cancel semantics, same history finalization, same diagnostics meaning, and same visible result behavior.
- If a cleanup exposes a design gap, document the gap and stop at the agreed boundary rather than inventing an adjacent subsystem.

## Canonical Result And MathJSON Authority Policy
- Every new successful result producer, new math-bearing controlled-error producer, and materially changed result producer must build a validated `CanonicalResultDocumentV2` through its workspace-owned adapter before the final runtime boundary. The sole approved V3 widening is the typed angle-quantity primary for an angle magnitude plus `deg`, `rad`, or `grad`; V2 remains the default for every route, and only a reviewed selector that genuinely needs that unit semantic may emit `CanonicalResultDocumentV3`. Every genuine V2 or V3 math leaf requires producer-proven standard MathJSON. It must pass `requireCanonicalResultAuthority`, `npm run test:canonical-result-v2-enforcement`, `npm run test:display-contract-inversion`, and `npm run test:result-contract`. Do not add a compatibility registration, broad forwarding exemption, or string-only result path to make a producer pass.
- V1 is permitted only inside the exact files recorded by `tools/canonical-result-v2-enforcement-baseline.json` while those files remain byte-identical to their accepted SHA-256 fingerprints. Any edit to a frozen file, including formatting or imports, requires every V1 route owned by that file to default to V2 and the obsolete baseline entry to be removed. Frozen-file additions, digest rewrites, route-ownership rewrites, and growth of the 57-route V1 inventory are forbidden.
- MathJSON coverage exemptions remain permanently empty. If producer-owned proof is unavailable or neither V2 nor the approved V3 angle-quantity primary can express the required semantics, stop and obtain approval for a new canonical-result contract version; never encode the missing semantics in titles, prose, labels, metadata, detail strings, or canonical LaTeX.
- Every new semantic result consumer must read through `resolveCanonicalResultForConsumer` or an established canonical-derived read model. Never reparse rendered Display LaTeX, compatibility `exactLatex`, detail strings, clipboard text, or legacy History `resultLatex` as mathematical truth. Existing legacy readers may remain only in their registered compatibility boundaries, and their per-lane floor may not grow.
- Attach MathJSON only when the producer owns the proven answer tree. Route-specific tests must prove that the payload is the answer rather than normalized input, is structured-clone-safe and within the committed bounds, and serializes to the same canonical mathematical value. Never promote `normalizedMathJson` by name or proximity, reuse an input equation tree as an answer, or manufacture answer MathJSON by reparsing formatted output.
- Untouched frozen V1 producers may retain canonical LaTeX without inventing a tree only within their byte-identical accepted boundary. V2 and V3 producers fail closed when required producer proof is missing; they never fall back to V1.
- A capability milestone may use the solver's established native representation, but it must declare that representation and its conversion boundary. Do not force Equation, Calculus, Symbolic Integration, Linear Algebra, Statistics, or other independent solvers into one universal AST during ordinary capability work.
- A universal solver AST or shared mathematical interchange IR requires a dedicated approved architecture milestone with inventories, semantic-loss analysis, branch/assumption/proof requirements, conversion laws, performance evidence, and per-domain migration gates. It must not merge worker, host, capability, OOE, or replay ownership.
- If a new capability needs result structure not representable by `CanonicalResultDocumentV2` or the approved V3 angle-quantity primary, extend and version the canonical result contract first. Do not smuggle new semantics through titles, prose, detail strings, metadata labels, or canonical LaTeX alone.

## Scope
- This policy is project-local and should be followed automatically in future sessions for this repository.
