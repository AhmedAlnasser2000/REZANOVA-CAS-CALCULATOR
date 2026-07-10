# PRINT-HYGIENE-BASELINE1 Gate

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
- `backend`: pure mathematical fragment collection, malformed-marker checks, structured baseline, and explicit update policy.
- `ui`: full canary execution and refreshed visual inspection across all nine workspaces.

## Scope
- Collect typed `{ path, kind, value }` fragments from primary answers, rows, branches, systems, periodic structures, supplements, prompt carry, transforms, actions, typed detail math, resolved input, and substitution values.
- Collect Table row values separately and allow a complete `undefined` cell as legitimate real-domain evidence.
- Reject bounded standalone `NaN`, standalone `undefined`, internal-error markers, and `[object Object]` only in collected mathematical fragments.
- Normalize whitespace across all 43 golden executions without stripping parentheses.
- Require `--accept` and a committed reason for baseline updates; reject snapshot `-u` paths.

## Evidence
- Print hygiene: 7/7 passed; baseline case count 43 with two or more successful entries per workspace.
- Display contracts: 121/121 library and 21/21 UI passed.
- Chromium: 19/19 canaries plus nine refreshed curated surfaces; all inspected cleanly.
- Golden: 44/44 passed.
- TypeScript/build, lint, OOE/compartment boundaries, file-size ratchet, canary registry, and diff hygiene passed.

## Durable Boundary
- This milestone establishes evidence only. It does not redesign printing, serialization, detail segments, rendering, or clipboard behavior.
- Prose is not heuristically reclassified as math.
- Statistics guided-control work and Matrix/Vector capability expansion remain outside the milestone.

## Outcome
- `verification-pass`; Behavioral Ratchet 7 is ready for its standing-approved commit.

## Memory Updated
- `.memory/current-state.md`
- `.memory/decisions.md`
- `.memory/journal/2026-07/2026-07-11.md`
- `.memory/research/roadmaps/anti-regression-nine-move-roadmap.md`
- This master dossier's status, completion, verification, commit log, and Move 7 gate record.

## Next
- Commit `PRINT-HYGIENE-BASELINE1`.
- Begin `WORKSPACE-FRESHNESS-REPORT1` after the commit checkpoint.
