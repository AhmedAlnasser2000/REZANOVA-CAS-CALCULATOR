# EQUATION-ROOT-TEST-SURFACE-TIDY1 Completion Report

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors:
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live

## Task Goal

Split oversized Equation root tests into focused test-surface files while preserving root facade coverage.

## What Changed

- Split `guarded-solve.test.ts` into focused guarded test files for contract behavior, stage routing, and composition/periodic routing.
- Split `shared-solve.test.ts` into focused shared-solve test files for transforms, absolute-value routing, and radicals/carriers.
- Added a tiny test-only base request helper under `src/lib/equation/test-support/`.
- Kept moved tests importing through root facades where compatibility is being proven.
- Updated `tools/file-size-baseline.json`; the two stale root-test baseline entries were removed.

## Boundaries

- Test intent and assertions were preserved.
- No production Equation code changes.
- No solver behavior, output wording, display/readback, OOE/runtime policy, replay/history, schema, capability, worker-host, or reserved-symbol changes.

## Verification

- `npx tsc -b --pretty false` passed.
- `npm run test:unit -- src/lib/equation/guarded/*.test.ts src/lib/equation/shared-solve-tests/*.test.ts` passed.
- `npm run test:unit -- src/lib/equation/solver-parity.contract.test.ts src/lib/modes/equation.test.ts` passed.
- `node tools/validate-file-sizes.mjs --update-baseline` removed two stale entries and raised no caps.
- `npm run test:file-sizes` passed.
- `npm run test:memory-protocol` passed.
- `git diff --check` passed.

## Commits

- Same-commit milestone: EQUATION-ROOT-TEST-SURFACE-TIDY1.

## Follow-Ups

- Continue with `EQUATION-DOMAIN-SHARED-SURFACE-AUDIT0`.
