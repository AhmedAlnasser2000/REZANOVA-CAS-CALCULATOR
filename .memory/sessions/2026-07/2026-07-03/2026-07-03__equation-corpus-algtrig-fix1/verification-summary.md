# EQUATION-CORPUS-ALGTRIG-FIX1 Verification Summary

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live

## Commands

- `npx vite-node --script .task_tmp/equation-corpus-scan1/run-openstax-batch.ts --write-fix-ledger`
  - Passed; all 50 scanned cases classified supported after the fixes and six post-fix rows were appended under `2026-07-03-openstax-algtrig-fix1`.
- `node --test tools/validate-equation-corpus-ledger.test.mjs && node tools/validate-equation-corpus-ledger.mjs`
  - Passed; ledger has 10 sources, 50 unique cases, 0 duplicate records, 56 run results, and 6 scan findings.
- `npx vitest run src/lib/modes/equation/equation-corpus-algtrig-fixes.test.ts src/lib/equation/shared-solve-tests/transforms.test.ts`
  - Passed; 28 tests.
- `npx vitest run src/lib/equation/parameterized/factorable-polynomial.test.ts src/lib/equation/parameterized/exp-log.test.ts src/lib/equation/parameterized/special-form-roots.test.ts src/lib/equation/parameterized/rational.test.ts src/lib/equation/parameterized/trig.test.ts`
  - Passed; 103 tests.
- `npx vitest run src/lib/modes/equation/deterministic-numeric-algebraic.test.ts src/lib/modes/equation/real-periodic-interval-numeric.test.ts src/lib/equation/numeric-interval/solve.test.ts`
  - Passed; 44 tests.
- `npm run test:file-sizes`
  - Passed.
- `npx tsc --noEmit --pretty false`
  - Passed.
- `npm run test:memory-protocol`
  - Passed.
- `git diff --check`
  - Passed.

## Notes

- `src/lib/modes/equation/shared-symbolic-backend.test.ts` still has seven failures on clean `HEAD` and in the active worktree. They are baseline drift around radical/log/composition supplements and numeric fallback boundaries, not introduced by this fix gate.
- The recurring Node warning about `NO_COLOR` being ignored when `FORCE_COLOR` is set appeared during commands and was non-fatal.
