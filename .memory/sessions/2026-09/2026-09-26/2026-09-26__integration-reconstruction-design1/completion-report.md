# INTEGRATION-RECONSTRUCTION-DESIGN1

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-6-astra
- primary_agent_family: astra
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-6-astra
- recorded_by_agent_family: astra
- verified_by_agent: codex
- verified_by_agent_model: gpt-6-astra
- verified_by_agent_family: astra
- attribution_basis: live

## Authority and scope

- 2026-09-26: user replied “i approve” to the explicit CRITICAL root-only design investigation. No subagents used. Prior instruction “dont commit” remains in force.
- Design and documentation only; no production/test/config source edits, dependencies, code reuse, commits or pushes.
- Initial branch/head: `main` / `a8d2c423`. Existing Graphing and source-mirror work is independent and preserved.

## Outcome

- Wrote the path-backed reconstruction design and replacement inventory, plus the concrete first implementation specification.
- Selected TypeScript/native bigint, Q and Q(t) generic arithmetic and a private integration core; no new runtime dependency or in-place replacement of the shared scalar core.
- Updated the provisional roadmap: internal root-sum/subresultant representation and product adoption are explicit prerequisites around rational completion.
- Runtime ownership, proof/output boundaries, frozen V1 owners, parameter specialization and later mixed/algebraic proof obligations are recorded.
- General algebraic-root result semantics and existing V4 policy wording remain review gates before producer widening. They do not block the isolated first algebra implementation.
- `INTEGRATION-EXACT-ALGEBRA1` is specified but unstarted; implementation needs its own approval. This does not claim full theorem-by-theorem verification of later algebraic/mixed algorithms.

## Evidence

- See verification-summary.md for the scalar counterexample, representative MathJSON conversion, 17 focused tests and three Playwright baseline cases.
- Direct consumer inventory saved as direct-consumers.json; temporary probe/visual logs under `.task_tmp/integration-reconstruction-design1/`.

## Durable memory updated

- `.memory/current-state.md`
- `.memory/decisions.md`
- `.memory/open-questions.md`
- `.memory/journal/2026-09/2026-09-26.md`
- This dossier's completion report, verification summary and attributed direct-consumer inventory.

## Handoff

Next is the backend-only first implementation specification in `docs/architecture/calculus/integration-exact-algebra1-spec.md`. Preserve the unrelated Graphing edits and the standing no-commit instruction. No app-summary/checkpoint shipping update is needed: this is a future implementation design and changes no shipped capability.
