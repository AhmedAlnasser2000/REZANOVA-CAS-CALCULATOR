# TRANSCENDENTAL-RISCH-EXP-QUADRATIC-CERTIFICATE1 Verification Summary

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live

## Evidence

- Passed: `npx vitest run src/lib/symbolic-engine/integration-transcendental-certificate-exp-quadratic-proof.test.ts src/lib/symbolic-engine/integration-transcendental-certificate-result-shape.test.ts src/lib/symbolic-engine/integration-transcendental-certificate-profile.test.ts src/lib/symbolic-engine/integration-transcendental-certificate-proof-diff.test.ts`.
- Passed: `npx vitest run src/lib/calculus/engine/core.test.ts src/lib/calculus/workspace/integrals.test.ts`.
- Passed: `npx vitest run src/lib/symbolic-engine/integration.test.ts src/lib/calculus/engine/core.test.ts src/lib/calculus/workspace/integrals.test.ts`.
- Passed: `git diff --check`.

## Blocked Repo-Wide Gates

- Blocked unrelated: `npx tsc -b --pretty false` currently fails in `src/lib/modes/equation/real-periodic-interval-numeric.ts` because `exactLatex` is read from the broad `DisplayOutcome` union.
- Blocked unrelated: `node tools/validate-file-sizes.mjs` currently fails because `src/app/logic/runtimeControllers.test.ts` and `src/app/logic/runtimeControllers.ts` exceed their line caps.

## Scope Verification

- The live dispatch slice is isolated to Calculus indefinite integration, certificate result shaping, and focused Calculus tests.
- Certificate results intentionally omit antiderivative backcheck, integration candidate, and public strategy metadata.
- Other-agent dirty files were not staged.
