# EQUATION-RECONSTRUCTION-DESIGN1

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

- 2026-10-03: the user approved the plan for this CRITICAL, root-only design gate in a Claude Code cloud session (plan-mode approval). Execution used no subagents. During planning, one read-only Explore agent mapped the docs and memory conventions.
- User choices recorded in the plan: run in the cloud session on branch `claude/confident-goodall-fbqe99`; include the gate 2 specification; record a backend-only baseline of the old engine; keep old Equation until New Equation is proven, then retire it.
- Design, documentation and a read-only probe only. No production, test or configuration source edits, dependencies, schema or UI. Commit and push need separate explicit approval.
- Starting branch/head: `claude/confident-goodall-fbqe99`, fast-forwarded to `origin/main` at `6a93236`.

## Outcome

- Wrote the [design](../../../../../docs/architecture/equation/equation-reconstruction-design.md), [blueprint](../../../../../docs/architecture/equation/equation-reconstruction-blueprint.md), [inventory and baseline](../../../../../docs/architecture/equation/equation-reconstruction-inventory.md), [roadmap](../../../../../docs/architecture/equation/equation-reconstruction-roadmap.md) and the [EQUATION-EXACT-ALGEBRA1 specification](../../../../../docs/architecture/equation/equation-exact-algebra1-spec.md).
- Locked decisions:
  - a private core with an isolation test;
  - private exact algebra with integration-compatible conventions;
  - work/allocation/cancelled as the only stop reasons, with a no-caps ratchet;
  - termination by progress measures, a visited set and iterative deepening;
  - all-or-nothing outcomes with no partial roots;
  - verification by an equivalence chain, with "unconfirmed" instead of dropping;
  - V6 before adoption;
  - a new workspace at adoption.
- Inventory: 45 cap constants plus the 5 runtime-profile budgets, each classified as shape, exponential algorithm, output size, math boundary or numeric control.
- Baseline: 50 equations through `runEquationMode` (exact mode, real). 27 exact and correct; 13 approximate only although exact answers exist; 2 appropriately numeric; 6 refused or mislabelled; **2 false "no roots"** (nested absolute values).
- `EQUATION-EXACT-ALGEBRA1` is specified, not started.

## Evidence

See verification-summary.md. Raw probe outputs: `.task_tmp/equation-reconstruction-design1/` (git-ignored).

## Durable memory updated

- `.memory/current-state.md`
- `.memory/decisions.md`
- `.memory/open-questions.md`
- `.memory/journal/2026-10/2026-10-03.md`
- This dossier's completion report, verification summary and commit log.
- `docs/architecture/README.md` (Equation index entries).

## Handoff

Next is `EQUATION-EXACT-ALGEBRA1`; it requires its own approval. Three open questions are recorded: whether the algebraic-numbers gate merges into gate 2, V6 scope and adoption order, and the timing of old-engine retirement. No app-summary or checkpoint update is needed, because no shipped capability changed.
