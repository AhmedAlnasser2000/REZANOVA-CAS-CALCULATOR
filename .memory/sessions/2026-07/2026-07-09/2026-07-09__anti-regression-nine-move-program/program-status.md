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
- `CI-GATE-ALIGNMENT1`: committed as `948f2df3`.
- `SEAM-IMPACT-SELECTOR1`: committed as `8fd8e788`.
- Mandatory Incident Review: verification complete; accepted by the user on `2026-07-10`.
- `LINEAR-ALGEBRA-SHELL-SPLIT0`: verified; split-eligibility threshold not met.
- `MATRIX-VECTOR-RUNTIME-SHELL-SPLIT1`: implemented and verified; approved commit checkpoint pending completion in this milestone.
- Behavioral Ratchets 5-9: not started; Matrix/Vector feature expansion is frozen through Move 9.
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
- Broad unit baseline after the supplemental canonical-abs repair: 3,450/3,450 passed.
- The seam selector passes 8/8 focused tests and emits stable plans for explicit paths, Git ranges, and GitHub events, including rename/copy/delete handling and empty or invalid input boundaries.
- The CI-alignment ratchet now passes 8/8 tests, requires full checkout history, and requires additive seam evidence before the broad unit suite without weakening any baseline gate.
- The real allowlisted wrapper passed 74/74 workspace runtime-contract tests; all four allowlisted contract groups passed 445 tests. Matrix and Vector classify independently, while shared Linear Algebra paths select both lanes.
- The current-main mandatory sweep passed 19/19 Chromium canaries in 1.3 minutes with full-page visual inspection across all nine workspaces. DEG/RAD inverse-trig output remained visibly `90` and `\pi/2`.
- The user-reported four-file CI set passes 71/71. The scoped Complex absolute-value result now survives canonical `\operatorname{abs}` planner normalization, and its real-app empty-set card, facts, and candidate evidence were inspected.
- `test-results/` remains untracked and excluded from staging. A restricted-environment retry regenerated its transient Playwright contents before later runs were redirected to `.task_tmp/`.
- The user accepted the completed Incident Review before planning the continuation.
- The Linear Algebra shell audit ran five cold and twenty warm browser worker samples for each light and maximum-cap Matrix/Vector fixture. Browser P95s were effectively equal; maximum serialized request/result sizes differed by 1.14x/1.31x.
- Production loaded-worker reductions were 1.34% gzip for Matrix-only and 5.00% for Vector-only. Shared fallback, hard-stop, diagnostics, stale/commit, and History-ticket behavior passed 21 focused tests. No approved split criterion was met.
- After reviewing that result, the user locked separate Matrix and Vector hosts prospectively for the approved Matrix numerical-decomposition/conditioning and Vector exact/geometric arcs. This does not convert the audit into a pass; it is a separate topology policy decision.
- Matrix now selects `matrix-worker-runtime` with `matrix-runtime` fallback and `matrix-worker-shell`; Vector selects `vector-worker-runtime` with `vector-runtime` fallback and `vector-worker-shell`. Vite emits separate `matrix.worker` and `vector.worker` assets and no shared Linear Algebra worker asset.
- All 19 workspace canaries passed in 1.2 minutes. Structured Matrix profile and Vector independence cards were inspected at final `Ready` state without clipping, overlap, or unreadable evidence.
