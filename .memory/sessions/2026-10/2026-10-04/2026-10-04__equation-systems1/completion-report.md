# EQUATION-SYSTEMS1 (part A)

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

- 2026-10-04: after #18 merged, the user asked to plan this gate "accurately" and to be asked where needed. The plan was approved in plan mode. The user's choices:
  - linear plus triangular infinite sets;
  - exact points (asked again in plain words);
  - linear parameters with cases;
  - kernels by elimination;
  - one PR with two commits.

  During part A the user added: "dont stop when you push commit A and PR, finish the whole slice with part B also". Commit, push and PR were pre-authorized.
- No code from the old Equation engine is used, imported or copied.
- CRITICAL, root-only, no subagents. The branch was restarted from `origin/main` (`5fc94f9`).
- Scope:
  - new `core/systems/`;
  - multi-target atoms in `parameters/specialize.ts`;
  - parametric sets in `instantiate`/`sameSet`;
  - a re-derivation hook in the parameters verifier;
  - routing in `decide.ts`;
  - test display;
  - spec, roadmap, README and Equation memory.

  No edits to the integration core, contracts, OOE or UI.

## Outcome

- Systems in several targets are decided when linear, also with parameters.
- Nonlinear systems and kernels name part B; inequalities name `EQUATION-SEMIALGEBRAIC1`.

## Evidence

See verification-summary.md.

## Durable memory updated

- `.memory/current-state.md`, `.memory/decisions.md`, `.memory/journal/2026-10/2026-10-04.md`
- `docs/architecture/equation/equation-systems1-spec.md` (new), the roadmap (stage 11 and a ledger row) and `docs/architecture/README.md`
- This dossier.
