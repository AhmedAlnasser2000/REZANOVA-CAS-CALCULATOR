# EQUATION-COMPOSITION1 (parts A and B)

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

- 2026-10-03: the user asked to plan this gate "accurately" and approved the plan in plan mode. The user's choices:
  - range reasoning split by exact sign (after asking how it differs from all-or-nothing);
  - monotone targets: uniqueness plus exact candidates;
  - a new interval-family set kind;
  - several principal complex logs only (after asking how it differs from all deferred items);
  - delivery in two PRs.

  Commit, push and PR were pre-authorized when green.
- No code from the old Equation engine is used, imported or copied.
- CRITICAL, root-only, no subagents. The work was built locally while #15 was pending, then the branch was restarted from `origin/main` after #15 merged.
- Scope:
  - new `core/composition/`;
  - hooks in `generators/inversion.ts`, `closed-form-set.ts` and `verify.ts`;
  - the `interval-family` kind in `representation/solution-set.ts` and `wire.ts`;
  - two enclosure exports;
  - test helpers;
  - spec, roadmap, README and Equation memory.

  No edits to the integration core, contracts, OOE or UI.

## Outcome

- Exact real decisions for mixed kernels by injective cancellation, certified ranges and monotonicity with confirmed exact candidates.
- Inequalities through a non-affine common trig argument as interval families.
- Non-closed-form boundaries are refused, naming certified numerics.

## Evidence

See verification-summary.md.

## Durable memory updated

- `.memory/current-state.md`, `.memory/decisions.md`, `.memory/journal/2026-10/2026-10-03.md`
- `docs/architecture/equation/equation-composition1-spec.md` (new), the roadmap and `docs/architecture/README.md`
- This dossier.

## Part B

- **Authority**: 2026-10-04, the user merged #16 and asked to check it and start part B. I checked that main equals the pushed commit. The part B plan was approved in plan mode, and the branch was restarted from `origin/main`.
- **Scope**:
  - several principal logs over ℂ in `periodic/complex-zeros.ts`;
  - the new `representation/log-zero.ts` and its use in `realSign`;
  - enclosure speedups in `representation/enclosure.ts`;
  - `composition/depth.test.ts` and the new complex tests;
  - spec, roadmap, README and Equation memory.

  No old-engine code; no edits to the integration core, contracts, OOE or UI.
- **Outcome**: Σ cⱼ·Log uⱼ = c over ℂ is decided exactly. Depth 3 and depth 25 are decided by the same code. This completes `EQUATION-COMPOSITION1`.

## Handoff

The gate is complete. Next is `EQUATION-PARAMETERS1` (case trees over ℚ(p…)), which needs its own approval. Nothing is product-adopted.
