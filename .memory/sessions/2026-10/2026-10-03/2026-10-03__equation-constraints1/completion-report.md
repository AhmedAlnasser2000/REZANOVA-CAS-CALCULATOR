# EQUATION-CONSTRAINTS1

## Attribution

- primary_agent: claude
- primary_agent_model: claude-opus-5-5
- primary_agent_family: opus-5.5
- recorded_by_agent: claude
- recorded_by_agent_model: claude-opus-5-5
- recorded_by_agent_family: opus-5.5
- verified_by_agent: claude
- verified_by_agent_model: claude-opus-5-5
- verified_by_agent_family: opus-5.5
- attribution_basis: live

## Authority and scope

- 2026-10-03: after PR #12 merged, the user asked to plan this gate and approved the plan in plan mode. The user chose: real domain only (complex modulus and radicals `unsupported`), full radicals including nested towers, HC4 range contractors moved to `EQUATION-COMPOSITION1`, and mixing with slice 2 included (radical elimination stays algebraic). Inequalities and conjunctions as in slices 1-2. Commit, push and PR were pre-authorized when green.
- CRITICAL, root-only, no subagents. Branch hygiene: `origin/main` merged with a merge commit; `git diff origin/main` empty before work.
- Scope: new `core/constraints/`; engine changes in `core/generators/` (inversion, closed-form decomposition, samples, normal form, pipeline, verifier) and `core/decide.ts`; the (c·A)^r fold in `core/representation/expression.ts`; `exactSign` export in `core/representation/real-order.ts`; an Aberth seeding fix in `core/algebraic/complex-roots.ts`; spec, roadmap, README and Equation memory. No edits to the old Equation engine, the integration core, contracts, OOE or UI.

## Outcome

- Exact real decisions for absolute values (lazy branching, zero intervals) and radicals (inversion, same-base lattice, tower-norm elimination with exact confirmation), mixed with exp/log, for equations, inequalities and conjunctions, with proof logs and an independent verifier.
- Corpus A1-A4 (A2 and A3 were the old engine's false "no roots"), S1-S4 and M1 exact.
- Dependent radicals (vanishing norm), radicals next to transcendental constants, and complex modulus/radicals are refused honestly.

## Evidence

See verification-summary.md.

## Durable memory updated

- `.memory/current-state.md`, `.memory/decisions.md`, `.memory/journal/2026-10/2026-10-03.md`
- `docs/architecture/equation/equation-constraints1-spec.md` (new), the roadmap and `docs/architecture/README.md`
- This dossier's completion report, verification summary and commit log.

## Handoff

Next is `EQUATION-PERIODIC1` (slice 4): trig algebraization, periodic families and complex exp/log families. It needs its own approval. Nothing is product-adopted.
