# EQUATION-GENERATORS1

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

- 2026-10-03: after PR #11 merged, the user asked to plan this gate "accurately" and approved the plan in plan mode. The user chose: real domain only (complex exp/log to the periodic gate), inequalities and conjunctions, the full canonical Lambert class, nested exp/log chains (C6/C7 moved here), inner quadratic levels with transcendental constants, and transcendental generator coefficients only with shifts or degree 1. Commit, push and PR were pre-authorized when green.
- CRITICAL, root-only, no subagents. Branch hygiene: `origin/main` merged with a merge commit; `git diff origin/main` empty before work.
- Scope: new `core/generators/` and `core/decide.ts`; substrate additions in `core/algebra/integer.ts` and `core/representation/` (enclosures, real order, LambertW, number-only folds, closed-form ordering); generic interval assembly in `core/decision/real-set.ts`; spec, roadmap, README and Equation memory. No edits to the old Equation engine, the integration core, contracts, OOE or UI.

## Outcome

- Exact real decisions for exp/log/power/Lambert-W equations, inequalities, conjunctions and nested chains, with proof logs and an independent verifier.
- Corpus E1-E9 and C6/C7 exact; 2^x = x+1 gives exactly {0, 1}; equivalent forms converge.
- Out-of-scope shapes are refused naming the owning gate.

## Evidence

See verification-summary.md.

## Durable memory updated

- `.memory/current-state.md`, `.memory/decisions.md`, `.memory/journal/2026-10/2026-10-03.md`
- `docs/architecture/equation/equation-generators1-spec.md` (new), the roadmap and `docs/architecture/README.md`
- This dossier's completion report, verification summary and commit log.

## Handoff

Next is `EQUATION-CONSTRAINTS1` (slice 3): range contractors, sign intervals, lazy branches, absolute values and radical generators. It needs its own approval. Nothing is product-adopted.
