# EQUATION-ROOT-FACADE-TIDY1 Completion Report

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

Apply the low-risk root facade tidy actions approved by the root facade audit.

## What Changed

- Added short compatibility-facade comments to the root Equation facades.
- Normalized `src/lib/equation/guarded-solve.ts` so type re-exports appear before value re-exports.
- Kept all root facade exports and public import paths stable.
- Added same-commit memory records for the tidy milestone.

## Boundaries

- No facade deletion.
- No active root surface movement.
- No broad root test relocation.
- No solver behavior, output wording, display/readback, OOE/runtime, replay/history, schema, capability, worker-host, or reserved-symbol changes.

## Verification

- `npx tsc -b --pretty false` passed.
- `npm run test:unit -- src/lib/equation/candidate/*.test.ts src/lib/equation/target/*.test.ts src/lib/equation/composition/core.test.ts src/lib/equation/parameterized/composition.test.ts src/lib/equation/equation-complex.test.ts src/lib/equation/equation-algebraic-isolation.test.ts src/lib/equation/equation-selected-target-isolation.test.ts src/lib/equation/guarded-solve.test.ts src/lib/equation/substitution-solve.test.ts` passed.
- `npm run test:file-sizes` passed.
- `npm run test:memory-protocol` passed.
- `git diff --check` passed.

## Size Ratchet

- No file-size baseline update was required.

## Commits

- Same-commit milestone: EQUATION-ROOT-FACADE-TIDY1.

## Follow-Ups

- Continue with `EQUATION-ROOT-SURFACE-MAP1`.
