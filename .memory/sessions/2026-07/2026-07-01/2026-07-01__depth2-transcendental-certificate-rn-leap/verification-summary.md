# Verification Summary

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
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

## TRANSCENDENTAL-EI-LI-AFFINE-CERTIFICATE1

- Gate label: backend
- Focused tests:
  - `npx vitest run src/lib/symbolic-engine/integration-transcendental-special-functions.test.ts src/lib/calculus/workspace/integrals.test.ts`
  - Result: pass, 2 files / 30 tests.
- Regression tests:
  - `npx vitest run src/lib/symbolic-engine/integration-transcendental-special-functions.test.ts src/lib/symbolic-engine/integration.test.ts src/lib/calculus/engine/core.test.ts src/lib/calculus/workspace/integrals.test.ts`
  - Result: pass, 4 files / 100 tests.
- `npx tsc -b --pretty false`
  - Result: blocked by unrelated Surface Protocol lane errors in `src/lib/surface-protocol/dto.test.ts` referencing `RuntimeAdvisories.advisories` and `src/lib/surface-protocol/spec-examples.test.ts` missing `node:fs` type resolution.
  - Action: not edited or staged for this integration milestone.
- `node tools/validate-file-sizes.mjs`
  - Result: pass.
- `npm run test:memory-protocol`
  - Result: pass.
- `git diff --check`
  - Result: pass.

## RN-DEPTH2-DERIVATIVE-SUBSTITUTION1

- Gate label: backend
- Focused tests:
  - `npx vitest run src/lib/symbolic-engine/integration-risch-norman-depth2-substitution.test.ts`
  - Result: pass, 1 test.
- Regression tests:
  - `npx vitest run src/lib/symbolic-engine/integration-risch-norman-depth2-substitution.test.ts src/lib/symbolic-engine/integration-transcendental-depth2-profile.test.ts src/lib/symbolic-engine/integration.test.ts src/lib/calculus/engine/core.test.ts src/lib/calculus/workspace/integrals.test.ts`
  - Result: pass, 5 files / 99 tests.
- `npx tsc -b --pretty false`
  - Result: blocked by unrelated dirty app runtime work in `src/app/runtime/useHistoryDisplayRuntime.ts` with TS1128 parse errors.
  - Action: not edited or staged for this integration milestone.
- `node tools/validate-file-sizes.mjs`
  - Result: blocked by the same unrelated dirty app runtime work; `src/app/runtime/useHistoryDisplayRuntime.ts` is 939 lines against its 900-line cap.
  - Action: not edited or staged for this integration milestone.
- `npm run test:memory-protocol`
  - Result: pass.
- `git diff --check`
  - Result: pass.

## SPECIAL-FUNCTION-FRESNEL-SUBSTRATE1

- Gate label: backend
- Focused tests:
  - `npx vitest run src/lib/symbolic-engine/differentiation.test.ts src/lib/symbolic-engine/differentiation-preflight.test.ts src/lib/symbolic-engine/integration-transcendental-certificate-proof-diff.test.ts src/lib/symbolic-engine/integration-transcendental-special-functions.test.ts`
  - Result: pass, 4 files / 30 tests.
- Regression tests:
  - `npx vitest run src/lib/symbolic-engine/integration-risch-norman-depth2-substitution.test.ts src/lib/symbolic-engine/integration-transcendental-depth2-profile.test.ts src/lib/symbolic-engine/integration-transcendental-special-functions.test.ts src/lib/symbolic-engine/integration.test.ts src/lib/calculus/engine/core.test.ts src/lib/calculus/workspace/integrals.test.ts`
  - Result: pass, 6 files / 107 tests.
- `npx tsc -b --pretty false`
  - Result: blocked by unrelated Surface Protocol lane errors in `src/lib/surface-protocol/dto.test.ts` referencing `RuntimeAdvisories.advisories` and `src/lib/surface-protocol/spec-examples.test.ts` missing `node:fs` type resolution.
  - Action: not edited or staged for this integration milestone.
- `node tools/validate-file-sizes.mjs`
  - Result: blocked by unrelated dirty app shell work; `src/AppMain.tsx` is 3449 lines against its 3357-line cap.
  - Action: not edited or staged for this integration milestone.
- `npm run test:memory-protocol`
  - Result: pass.
- `git diff --check`
  - Result: pass.

## TRANSCENDENTAL-PRACTICAL-CERTIFICATE-CHECKPOINT0

- Gate label: backend/docs
- Audit artifact:
  - `.memory/research/audits/transcendental-practical-certificate-checkpoint0-2026-07-01.md`
- Runtime/code tests:
  - Not rerun for this audit-only gate. No runtime source, solver route, Display schema, History, OOE, Tauri, persistence, public Calculus schema, or public strategy-label file changed.
- `npm run test:memory-protocol`
  - Result: pass.
- `git diff --check` over checkpoint files
  - Result: pass.
