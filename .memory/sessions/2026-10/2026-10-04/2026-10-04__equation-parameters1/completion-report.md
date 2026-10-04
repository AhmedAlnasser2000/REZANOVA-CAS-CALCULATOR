# EQUATION-PARAMETERS1 (part A)

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

- 2026-10-04: after #17 merged, the user asked to plan this gate and to be asked where needed, and approved the plan in plan mode. The user's choices:
  - any number of parameters, exact cells for one;
  - polynomial/rational relations and single kernels, with mixed kernels in a follow-up ledger covering every slice;
  - parametric RootOf from degree 3;
  - complex parameters with equations;
  - full real inequalities;
  - transcendental constant coefficients via RootOf;
  - one PR with two commits.

  Commit, push and PR were pre-authorized when green.
- No code from the old Equation engine is used, imported or copied.
- CRITICAL, root-only, no subagents. The branch was restarted from `origin/main` after #17 merged.
- Scope:
  - new `core/parameters/`;
  - the `root` value and `root-set` kind in `representation/solution-set.ts` and `wire.ts`;
  - `valueExpression` shared by four verifiers;
  - routing in `decide.ts`;
  - Liouville-bound zero/sign tests in `decision/algebraic-coefficients.ts`;
  - faster `refineReal`/`bisectReal` in `algebraic/root-of.ts`;
  - test helpers;
  - spec, roadmap, README and Equation memory.

  No edits to the integration core, contracts, OOE or UI.

## Outcome

- Polynomial and rational relations with coefficients in ℚ(p…) are decided as case trees:
  - one parameter: exact cells over ℝ and generic plus exceptional points over ℂ;
  - several parameters: sign-condition trees.
- Both roadmap exits hold: the quadratic with its a = 0 case, and x⁵ + a·x + 1 as parametric roots cut at the real zero of 256a⁵ + 3125.
- In answer to the user's question, any symbol can be the target. Automatic target choice is recorded for the ledger.

## Evidence

See verification-summary.md.

## Durable memory updated

- `.memory/current-state.md`, `.memory/decisions.md`, `.memory/journal/2026-10/2026-10-04.md`
- `docs/architecture/equation/equation-parameters1-spec.md` (new), the roadmap and `docs/architecture/README.md`
- This dossier.
