# RUBI-TIER1-POLY-BYPARTS-FEEDER1 Verification Summary

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5-codex
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5-codex
- verified_by_agent: codex
- verified_by_agent_model: gpt-5-codex
- attribution_basis: live

## Gate

- label: backend

## Evidence

- Verified `(x+1)^2e^x`, `(x^2+1)^2e^x`, `(x+1)^2\sin(x)`, `(x+1)^2\cos(2x+1)`, `(x+1)^2\ln(x)`, and `(x^2+1)^2\ln(x)` resolve through visible `integration-by-parts` with exact verification.
- Verified branch-sensitive, root-bearing, and over-degree feeder candidates remain unsupported instead of widening around prerequisites.
- Verified existing direct, substitution, inverse-trig, derivative-ratio, and partial-fraction behavior remains covered by the focused integration/core/workspace suites.

## Verification Commands

- Passed: `npx vitest run src/lib/symbolic-engine/integration.test.ts --reporter verbose`
- Passed: `npx vitest run src/lib/symbolic-engine/integration.test.ts src/lib/calculus/engine/core.test.ts src/lib/calculus/workspace/integrals.test.ts`
- Passed: `npx tsc -b --pretty false`
- Repo-wide gate blocked by unrelated dirty UI lane: `node tools/validate-file-sizes.mjs`
  - `src/AppMain.tsx` currently has 3392 lines against its 3357-line cap.
  - This milestone did not touch `src/AppMain.tsx`; the dedicated commit excludes that UI lane.
- Passed: `npm run test:source-mirrors`
- Passed: `npm run test:memory-protocol`
- Passed: `git diff --check`

## Commit Status

- Dedicated commit proceeding by user instruction; staged diff excludes the unrelated dirty UI/display lane that is keeping the repo-wide file-size gate red.
