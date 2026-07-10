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
- `WORKSPACE-CANARY-SUITE1`: committed as `6f8bf93b`.
- `WORKSPACE-RUNTIME-PROBE-REGISTRY1`: committed as `503eadb0`.
- `CI-GATE-ALIGNMENT1`: implemented, verified, and approved for its milestone commit.
- Incident Closure 4: pending.
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
- The nine-workspace runtime registry and direct Statistics/Table worker suites passed 19 focused tests; 74 surrounding runtime/OOE tests also passed.
- TypeScript, build, lint, file-size, OOE boundary, and compartment boundary gates pass for Move 2.
- A restored Chrome retry passed all three Calculate canaries with artifacts redirected to `.task_tmp/anti-regression/chrome-retry/`.
- CI alignment validator passes 7/7 and ratchets pull-request/`main` triggers, required commands, independent canary execution, pre-package release ordering, and zero retries.
- Chrome passes all 19 workspace canaries in 1.2 minutes and the preserved 11-case focused smoke in 52.8 seconds.
- The focused Equation carrier visual check passes with clean readable output and no double-minus serialization. It also exposes a pre-existing residual: two mathematically valid positive roots are still classified as extraneous in that deep nested case.
- Broad unit baseline after the carrier repair: 3,442 passed and the same two pre-existing Complex-abs tests failed.
- `test-results/` remains untracked and excluded from staging. A restricted-environment retry regenerated its transient Playwright contents before later runs were redirected to `.task_tmp/`.
