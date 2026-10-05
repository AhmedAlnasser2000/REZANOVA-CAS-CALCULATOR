# EQUATION-PERIODIC1 (parts A and B)

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

- 2026-10-03: after PR #13 merged, the user asked to plan this gate "accurately" and approved the plan in plan mode. The user chose every recommended option:
  - complex exp/log and trig families;
  - full periodic inequalities;
  - composition chains included;
  - bounded results enumerated as exact points;
  - inverse trig, single kernels and sums;
  - the target outside trig handled by factor split only;
  - residues in (−P/2, P/2];
  - coefficients as in slice 2;
  - delivery in two PRs (A real, B complex).

  Commit, push and PR were pre-authorized when green.
- The user also stated that no code from the old Equation engine is to be reused. None is used, imported or copied; the old engine is only the inventory baseline.
- The user allowed files in this gate to exceed the 1000-line cap, noting the ratchet should count code lines only. The ratchet was not changed, and every file stayed under the cap (the largest is `representation/solution-set.ts` at 609 lines).
- CRITICAL, root-only, no subagents. Branch hygiene: `origin/main` merged with a merge commit.
- Scope:
  - new `core/periodic/`, `core/representation/angles.ts` and `core/algebraic/cyclotomic.ts`;
  - changes in `core/representation/` (enclosure, evaluate, expression, real-order, solution-set, wire), `core/generators/` (inversion, closed-form-set, solve, verify), `core/constraints/piecewise.ts`, `core/decision/test-helpers.ts` and `core/decide.ts`;
  - spec, roadmap, README and Equation memory.

  No edits to the old Equation engine, the integration core, contracts, OOE or UI.

## Outcome

- Exact real decisions for sin, cos, tan, asin, acos and atan in one target, mixed with slices 1–3 and composed at any depth. They cover equations, full periodic inequalities and conjunctions, with proof logs and an independent verifier.
- Answers are canonical:
  - periodic sets, by residues in (−P/2, P/2], the minimal period and maximal orbits;
  - periodic tails on half-lines;
  - bounded middles as exact points;
  - families in integer parameters.
- Corpus T1–T7 and C1–C5 are exact. T6 on [0, 100] is the 32 points kπ.
- T5 reads π/2 + 2πk ∪ π/6 + (2π/3)k (the same set as π/2 + πk ∪ {π/6, 5π/6} + 2πk, in the canonical orbit form).
- These are refused honestly:
  - the target outside trig without a factor (certified numerics);
  - incommensurable frequencies;
  - symbolic frequencies (parameters);
  - inequalities with non-affine families (composition);
  - complex trig (part B).

## Evidence

See verification-summary.md.

## Durable memory updated

- `.memory/current-state.md`, `.memory/decisions.md`, `.memory/journal/2026-10/2026-10-03.md`
- `docs/architecture/equation/equation-periodic1-spec.md` (new), the roadmap and `docs/architecture/README.md`
- This dossier's completion report, verification summary and commit log.

## Part B (complex)

- 2026-10-03: after PR #14 merged, the user asked to continue; the part B plan was approved in plan mode. The user chose principal values for b^z over ℂ (exp(z·Log b) for any nonzero constant b). The branch was restarted from `origin/main`.
- Scope: new `core/periodic/` files (`rectangular.ts`, `complex-rules.ts`, `complex-zeros.ts`, `complex.ts`, `complex-verify.ts` and tests); store folds in `representation/expression.ts`; exact exponentials of complex linear forms in `representation/evaluate.ts`; the complex route in `generators/solve.ts` and `core/decide.ts`; constraint display in `decision/test-helpers.ts`; spec, roadmap, README and Equation memory. No old-engine code; no edits to the integration core, contracts, OOE or UI.
- Outcome: exact complex exp/log/power/trig decisions as canonical lattice families, non-affine families with exact constraints, exact intersections and exclusions; the principal log strip; honest refusals (complex Lambert, incommensurable frequencies, several logarithms, the complement of a family). This completes `EQUATION-PERIODIC1`.

## Handoff

The gate is complete. Next is `EQUATION-COMPOSITION1` (slice 5): range and injectivity reasoning at any depth, HC4 range contractors, inequalities with non-affine families and the complex intersections deferred here. It needs its own approval. Nothing is product-adopted.
