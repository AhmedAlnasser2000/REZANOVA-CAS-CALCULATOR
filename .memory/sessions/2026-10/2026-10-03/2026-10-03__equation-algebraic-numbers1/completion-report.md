# EQUATION-ALGEBRAIC-NUMBERS1

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

- 2026-10-03: the user approved the plan for this CRITICAL, root-only backend gate (plan-mode approval). The user included certified complex isolation and RootOf arithmetic, and pre-authorized commit and push when green. Delivery: gate 2 went first as its own PR ([AhmedAlnasser2000/REZANOVA-CAS-CALCULATOR#8](https://github.com/AhmedAlnasser2000/REZANOVA-CAS-CALCULATOR/pull/8)); this gate follows in a separate PR, after merging `origin/main` into the branch with a merge commit (no rebase or force-push).
- No subagents during execution. A rebase-and-force-push attempt to deliver gate 2 was blocked by the permission classifier and was not pursued; the user then chose the PR route.
- Scope: new private files under `src/lib/symbolic-engine/equation/core/`, the gate spec, roadmap/blueprint/README notes and Equation-owned memory. No edits to the old Equation engine, the integration core, contracts, OOE or UI.

## Outcome

- Factorization over Q:
  - F_p distinct-degree and Cantor–Zassenhaus splitting;
  - quadratic multifactor Hensel lifting;
  - Zassenhaus recombination with exact reconstruction.
- Real isolation: VCA, with a Sturm cross-check.
- Certified complex isolation:
  - Bini/Aberth seeding in doubles, with reversed-polynomial evaluation;
  - an exact Smale α-test using a rigorous bit-length bound;
  - pairwise-disjoint disks;
  - real-count consistency.
- RootOf: refinement, exact decimals, ordering, sign of g(α), and arithmetic (+, −, ·, 1/α, −α) by resultant interpolation with region filtering.

## Evidence

See verification-summary.md.

## Durable memory updated

- `.memory/current-state.md`, `.memory/decisions.md`, `.memory/journal/2026-10/2026-10-03.md`
- `docs/architecture/equation/equation-algebraic-numbers1-spec.md` (new), the roadmap, the blueprint, and `docs/architecture/README.md`
- This dossier's completion report, verification summary and commit log.

## Handoff

Next is `EQUATION-REPRESENTATION1`: the expression graph, relation problem, transform records, solution-set algebra and replay verifier. It needs its own approval. Nothing is product-adopted.
