# EQUATION-ROOT-TEST-SURFACE-TIDY1 Verification Summary

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors:
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live

## Scope

`EQUATION-ROOT-TEST-SURFACE-TIDY1` is a test-only split of oversized Equation root test files.

## Commands

- `npx tsc -b --pretty false`
- `npm run test:unit -- src/lib/equation/guarded/*.test.ts src/lib/equation/shared-solve-tests/*.test.ts`
- `npm run test:unit -- src/lib/equation/solver-parity.contract.test.ts src/lib/modes/equation.test.ts`
- `node tools/validate-file-sizes.mjs --update-baseline`
- `npm run test:file-sizes`
- `npm run test:memory-protocol`
- `git diff --check`

## Manual Checks

- Confirmed all 96 guarded `it` blocks and all 69 shared-solve `it` blocks were preserved in the split files.
- Confirmed the moved tests still import through root facades.
- Confirmed the largest new test file is under the default file-size ratchet.

## Outcome

All planned root test-surface tidy checks passed.

## Outstanding Gaps

No known `EQUATION-ROOT-TEST-SURFACE-TIDY1` gaps.
