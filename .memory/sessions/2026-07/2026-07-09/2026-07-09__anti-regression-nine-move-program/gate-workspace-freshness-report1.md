# WORKSPACE-FRESHNESS-REPORT1 Gate

## Attribution
- primary_agent: codex
- primary_agent_model: gpt-5.6
- primary_agent_family: sol
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.6
- recorded_by_agent_family: sol
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.6
- verified_by_agent_family: sol
- attribution_basis: live

## Gate Type
- `backend`: deterministic session evidence scan, alias registry, status report, and workflow contract.
- `ui`: weekly real Chromium canary execution remains the correctness evidence layer.

## Scope
- Require `--as-of YYYY-MM-DD` and support stable human or `--json` output.
- Scan dated session directories and match only session slugs through one central alias registry.
- Map anti-regression/canary aliases to all nine workspaces and Linear Algebra to Matrix plus Vector.
- Mark evidence older than 14 full days stale; keep stale and missing warning-only with exit zero.
- Fail invalid arguments or unreadable session repositories.
- Run weekly Monday at `03:17 UTC`, build, execute all 19 canaries, and publish reports without commits.

## Evidence
- Freshness tests: 5/5 passed.
- Live human and JSON reports: all nine fresh as of `2026-07-11`.
- CI alignment: 8/8 passed; weekly YAML parsed with installed `js-yaml`.
- Chromium canaries: 19/19 passed in 1.2 minutes.
- Build, lint, OOE/compartment boundaries, file sizes, canary registry, and diff hygiene passed.

## Durable Boundary
- Freshness measures attention, not health or correctness.
- Generated reports remain workflow artifacts and are never committed.
- The weekly browser canaries, not session age, are the correctness signal.

## Outcome
- `verification-pass`; Behavioral Ratchet 8 is ready for its standing-approved commit.

## Memory Updated
- `.memory/current-state.md`
- `.memory/decisions.md`
- `.memory/journal/2026-07/2026-07-11.md`
- `.memory/research/roadmaps/anti-regression-nine-move-roadmap.md`
- This master dossier's status, completion, verification, commit log, and Move 8 gate record.

## Next
- Commit `WORKSPACE-FRESHNESS-REPORT1`.
- Begin `HISTORY-REPLAY-RATCHET1` after the commit checkpoint.
