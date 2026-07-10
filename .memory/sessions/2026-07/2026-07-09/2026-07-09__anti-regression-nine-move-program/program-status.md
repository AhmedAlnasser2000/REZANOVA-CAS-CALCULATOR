# Anti-Regression Program Status

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

## Sequence
- `ATTRIBUTION-FAMILY-GOVERNANCE1`: committed as `98c2641f`.
- `WORKSPACE-CANARY-SUITE1`: implemented, verified, and approved for its milestone commit.
- Incident Closure 2-4: pending.
- Mandatory Incident Review: pending.
- Behavioral Ratchets 5-9: blocked by the review checkpoint.
- Printer/detail/clipboard arcs: deferred until nine-move closeout.

## Standing Constraints
- One verified commit per named milestone.
- Explicit approval before every commit or push.
- Statistics guided-control defects remain out of scope.
- Preserve independent runtime hosts, capability identities, existing ahead-one history, and unrelated `test-results/`.

## Current Evidence
- The 19-case Chromium suite passed in 74.90 seconds.
- Full-page screenshots under `.task_tmp/anti-regression/playwright-full/` were inspected across all nine workspaces.
- `test-results/` remains untracked and excluded from staging. A restricted-environment retry regenerated its transient Playwright contents before later runs were redirected to `.task_tmp/`.
