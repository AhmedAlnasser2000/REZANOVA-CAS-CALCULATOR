# EQUATION-RESULT-CONTRACT1 (parts A and B)

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

- 2026-10-04: after #20 merged, the user asked "now what is next". In plan mode the user chose:
  - every current set kind in V6;
  - non-answers typed in V6;
  - presentation as a separate gate;
  - AGENTS.md may be edited to list V6.

  The plan was approved; commit, push and PR were pre-authorized. The user also accepted the evidence cases still over 1 s for a later performance gate.
- No code from the old Equation engine is used. No file under `src/lib/calculus/new-integration/` is edited.
- CRITICAL, root-only, no subagents. The branch was restarted from `origin/main` (`e9c8238`).
- Scope, part A:
  - V6 types, validation, canonical LaTeX projection;
  - router, authority, consumer, normalization, coverage and registry wiring;
  - AGENTS.md;
  - contract tests, with two existing tests updated by design;
  - spec, roadmap (stage 13, the new `EQUATION-PRESENTATION1` row, ledger), README and memory.

## Outcome

- Part A: V6 exists and is validated, routed and recognized.
- Part B: the Equation adapter projects, validates and replays every corpus outcome, and has a V6 read model. No production caller. This completes the gate.

## Part B

- **Authority**: the same approved plan, continuing without stopping; commit and push to #21 were pre-authorized.
- **Scope**:
  - `src/lib/symbolic-engine/equation/result.ts`, `result-read.ts` and `result.test.ts`;
  - the isolation test's adapter list;
  - the typed-stop fix in `core/decide.ts`;
  - spec, roadmap, README and memory.

  No edits to New Integration, contracts beyond part A, OOE or UI.

## Evidence

See verification-summary.md.
