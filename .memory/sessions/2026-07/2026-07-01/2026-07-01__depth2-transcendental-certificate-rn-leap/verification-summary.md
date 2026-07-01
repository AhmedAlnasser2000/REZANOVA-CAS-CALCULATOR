# Verification Summary

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5-codex
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5-codex
- verified_by_agent: codex
- verified_by_agent_model: gpt-5-codex
- attribution_basis: live

## TRANSCENDENTAL-DEPTH2-TOWER-SUBSTRATE1

- Gate label: backend
- Focused tests:
  - `npx vitest run src/lib/symbolic-engine/integration-transcendental-depth2-profile.test.ts`
  - Result: pass, 5 tests.
- Regression tests:
  - `npx vitest run src/lib/symbolic-engine/integration-transcendental-depth2-profile.test.ts src/lib/symbolic-engine/integration.test.ts src/lib/calculus/engine/core.test.ts src/lib/calculus/workspace/integrals.test.ts`
  - Result: pass, 4 files / 96 tests.
- `npx tsc -b --pretty false`
  - Result: blocked by pre-existing/unrelated Surface Protocol lane error in `src/lib/surface-protocol/dto.test.ts` referencing `RuntimeAdvisories.advisories`.
  - Action: not edited or staged for this integration milestone.
- `node tools/validate-file-sizes.mjs`
  - Result: pass.
- `npm run test:memory-protocol`
  - Result: pass.
- `git diff --check`
  - Result: pass.

## SPECIAL-FUNCTION-SI-CI-SUBSTRATE1

- Gate label: backend
- Focused tests:
  - `npx vitest run src/lib/symbolic-engine/differentiation.test.ts src/lib/symbolic-engine/integration-transcendental-certificate-proof-diff.test.ts`
  - Result: pass, 2 files / 15 tests.
- Regression tests:
  - `npx vitest run src/lib/symbolic-engine/differentiation.test.ts src/lib/symbolic-engine/integration-transcendental-certificate-proof-diff.test.ts src/lib/symbolic-engine/integration.test.ts src/lib/calculus/engine/core.test.ts src/lib/calculus/workspace/integrals.test.ts`
  - Result: pass, 5 files / 106 tests.
- `npx tsc -b --pretty false`
  - Result: blocked by the same unrelated Surface Protocol lane error in `src/lib/surface-protocol/dto.test.ts` referencing `RuntimeAdvisories.advisories`.
  - Action: not edited or staged for this integration milestone.
- `node tools/validate-file-sizes.mjs`
  - Result: pass.
- `npm run test:memory-protocol`
  - Result: pass.
- `git diff --check`
  - Result: pass.

## TRANSCENDENTAL-SI-CI-AFFINE-QUOTIENT-CERTIFICATE1

- Gate label: backend
- Focused tests:
  - `npx vitest run src/lib/symbolic-engine/integration-transcendental-special-functions.test.ts src/lib/calculus/workspace/integrals.test.ts`
  - Result: pass, 2 files / 27 tests.
- Regression tests:
  - `npx vitest run src/lib/symbolic-engine/integration-transcendental-special-functions.test.ts src/lib/symbolic-engine/integration.test.ts src/lib/calculus/engine/core.test.ts src/lib/calculus/workspace/integrals.test.ts`
  - Result: pass, 4 files / 97 tests.
- `npx tsc -b --pretty false`
  - Result: blocked by the same unrelated Surface Protocol lane error in `src/lib/surface-protocol/dto.test.ts` referencing `RuntimeAdvisories.advisories`.
  - Action: not edited or staged for this integration milestone.
- `node tools/validate-file-sizes.mjs`
  - Result: pass.
- `npm run test:memory-protocol`
  - Result: pass.
- `git diff --check`
  - Result: pass.

## SPECIAL-FUNCTION-EI-LI-SUBSTRATE1

- Gate label: backend
- Focused tests:
  - `npx vitest run src/lib/symbolic-engine/differentiation.test.ts src/lib/symbolic-engine/differentiation-preflight.test.ts src/lib/symbolic-engine/integration-transcendental-certificate-proof-diff.test.ts`
  - Result: pass, 3 files / 21 tests.
- Regression tests:
  - `npx vitest run src/lib/symbolic-engine/differentiation.test.ts src/lib/symbolic-engine/differentiation-preflight.test.ts src/lib/symbolic-engine/integration-transcendental-certificate-proof-diff.test.ts src/lib/symbolic-engine/integration.test.ts src/lib/calculus/engine/core.test.ts src/lib/calculus/workspace/integrals.test.ts`
  - Result: pass, 6 files / 113 tests.
- `npx tsc -b --pretty false`
  - Result: blocked by the same unrelated Surface Protocol lane error in `src/lib/surface-protocol/dto.test.ts` referencing `RuntimeAdvisories.advisories`.
  - Action: not edited or staged for this integration milestone.
- `node tools/validate-file-sizes.mjs`
  - Result: pass.
- `npm run test:memory-protocol`
  - Result: pass.
- `git diff --check`
  - Result: pass.
