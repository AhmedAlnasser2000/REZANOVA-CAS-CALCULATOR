# Verification Summary

## Attribution
- primary_agent: codex
- primary_agent_model: gpt-5.6
- primary_agent_family: sol
- contributors:
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.6
- recorded_by_agent_family: sol
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.6
- verified_by_agent_family: sol
- attribution_basis: live
- commit_hash: this milestone commit

## Scope
- Backend governance gate for `ATTRIBUTION-FAMILY-GOVERNANCE1`.

## Commands
- `node --test tools/validate-memory-protocol.test.mjs` - passed 21 tests.
- `npm run test:memory-protocol` - passed.
- `npm run test:file-sizes` - passed 8 tests and validated 1,580 files.
- `git diff --check` - passed after removing trailing whitespace from three migrated attribution lines in one reference handoff.
- Exact attribution audit - `gpt-5` and `gpt-5-codex` eligible values are zero.
- Protected attribution audit - 591 `gpt-5.4` and 116 `gpt-5.3-codex` occurrences retain their pre-edit content digests.
- Migration-only audit - 2,110 non-governance tracked files match `HEAD` plus only the approved exact-field substitution.

## Manual Checks
- Confirmed the migration targets only recognized exact attribution model fields.
- Confirmed historical family values were not backfilled.

## Outcome
- Passed as a `backend` governance gate.

## Outstanding Gaps
- The governance gate did not change product runtime or UI.

## WORKSPACE-CANARY-SUITE1
- Kind: `ui` with supporting `backend` gates.
- Focused tests: 77 passed across carrier follow-on, public Equation routes, inverse trig, Trigonometry, and Geometry; the dedicated linear readback test also passed after extraction for file-size compliance.
- `npm run test:canary-registry`: 3 passed.
- Full Chromium canaries: 19/19 passed in 74.90 seconds.
- Visual inspection: full-page evidence covered all nine workspaces with readable answer surfaces, no error cards, and no observed overlap or clipping.
- `npx tsc -b --pretty false`, `npm run build`, and `npm run lint`: passed.
- `npm run test:file-sizes`: 8 passed; 1,582 files validated within caps.
- Broad `npm run test:unit`: 3,423 passed and 2 Complex-abs tests failed. Both failures reproduced unchanged in a detached clean-`98c2641f` worktree, so they are pre-existing and outside this milestone.
- `git diff --check`: passed before durable closeout.

## Outstanding Gaps After Move 1
- CI integration belongs to `CI-GATE-ALIGNMENT1`; this milestone adds scripts but does not yet replace workflow lanes.
- Statistics guided-control defects remain out of scope; direct structured requests are the stable canary path.
