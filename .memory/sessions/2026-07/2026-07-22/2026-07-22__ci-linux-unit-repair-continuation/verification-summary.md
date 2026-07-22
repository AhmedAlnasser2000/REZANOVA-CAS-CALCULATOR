# CI-LINUX-UNIT-REPAIR-CONTINUATION verification summary

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.6
- primary_agent_family: sol
- contributors: [claude]
- recorded_by_agent: claude
- recorded_by_agent_model: claude-opus-4-8
- recorded_by_agent_family: terra
- verified_by_agent: claude
- verified_by_agent_model: claude-opus-4-8
- verified_by_agent_family: terra
- attribution_basis: handoff
- gate_type: backend
- date: 2026-07-22
- commit_hash: pending at write time

## Scope

Checkpoint commit only. This is not a completed milestone: it preserves the codex-owned CI-Linux unit repair plus a bounded set of continuation fixes before the deferred readback-normalization work begins.

## Passing evidence

- The 6-hour CI hang is resolved. `integration-algebraic-genus1-second-kind-basis-readiness` previously consumed roughly 56 minutes and now completes in 109ms through the `precomputed-exact` proof path.
- `test:unit:ci` (`--bail=1 --testTimeout=120000`) bounds any future pathological test, so the 360-minute GitHub ceiling can no longer be reached by a single hanging case.
- Five symbolic-engine files are green (39 tests): rational-partial-fractions, risch-norman-log-rational-correction, genus1-second-kind-coefficient-identity-system, genus1-second-kind-coefficient-matrix, genus2-hyperelliptic-boundary.
- `npm run test:memory-protocol` passes 21/21, including the mandatory daily `current-state.md` catch-up (refreshed 2026-07-21 to 2026-07-22).
- An isolated `src/lib/symbolic-engine/` run completes in about 227s with no individual file above roughly 1.4s, establishing that the earlier "slow integration cluster" was contention from overlapping local vitest runs rather than inherent test cost. No test-isolation change was made.
- `rezanova-cas.com` returns HTTP 200 and serves the expected `REZANOVA CLASSWIZ CALCULATOR` document title.

## Known failing evidence

- 28 symbolic-engine tests across 9 files remain red and are committed knowingly red. They are correct tests catching real output defects; they were not relaxed.
- Root cause: `boxLatex()` (`patterns/latex.ts`) returns raw `ce.box(node).latex` with no normalization and has about 122 callers, while only 21 of 129 integration files route output through `normalizeGeneratedIntegrationLatex`. Seven ad-hoc `\exponentialE` patches already exist outside integration, so the leak is cross-workspace.
- A central normalizer addition was attempted in `integration/readback-hygiene.ts` and deliberately reverted: the failing routes bypass the shared normalizer entirely, so the change was inert.
- Full deferred set and the nine themes are recorded in `.memory/open-questions.md` under the 2026-07-22 entry.

## Visual evidence

- None captured. Playwright visual verification was not run for this checkpoint.
- Blocker recorded per the Visual Output Verification Policy: the deferred readback-normalization work changes app-visible mathematical output and must carry Playwright evidence of rendered result cards before it is considered verified. This checkpoint does not claim visual verification, and the one app-visible defect it knowingly leaves in place is the `\exponentialE` readback leak (`\int e^{2x}dx` returns `\frac{1}{2}\exponentialE^{2x}`), which is already live on the browser deployment.

## Final hygiene

- No release was cut. `release-linux.yml` runs `test:unit:ci` before packaging, so it would abort on the known-red suite; no attempt was made to bypass that gate.
- Protected prior `test-results/` artifacts remain untouched and excluded.
- Local verification logs remain under the session scratchpad and are excluded from the commit.
