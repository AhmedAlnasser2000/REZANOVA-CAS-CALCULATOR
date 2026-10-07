# TESTS-LEGACY-EQUATION-INERT1

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

- 2026-10-05: the user asked that the old Equation engine's tests be made inert, so full runs never run them, while the workspace and its logic stay and the tests stay runnable on demand.
- Decisions:
  - scope: old-engine behaviour only;
  - re-run: manual scripts only;
  - CI: the old steps are removed;
  - golden: cases added for New Equation and New Integration;
  - delivery: a separate gate after #23.
- The user also asked to fix the white Example menu and asked for tough test cases.
- The branch restarted from main (7b85f64). No New Integration folder is edited; the golden corpus calls its service.

## Delivered

See `docs/architecture/equation/tests-legacy-equation-inert1.md`. Summary:
- one legacy list with a flag;
- config exclusions (vitest unit and UI, Playwright);
- per-test helpers in shared files;
- legacy scripts;
- CI, seam-impact and gate-alignment entries removed;
- the golden corpus split into behaviour, contract and all sets, with typed golden execution for V6/V5;
- the print-hygiene baseline extended;
- the README and spec updated.

## Choice for the user to confirm

- **What**: contract ratchets keep the 6 old-Equation golden executions.
- **Why**: AGENTS.md forbids weakening coverage invariants or enforcement ratchets, and dropping them would lower recorded MathJSON and print-hygiene evidence.
