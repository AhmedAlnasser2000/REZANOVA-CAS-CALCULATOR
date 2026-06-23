# SYMBOLIC-EXPANSION-CONSUMER-PARITY1 Verification Summary

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

- Equation mixed-algebraic expansion now uses `expandMathJsonNodeOrOriginal`.
- Combined focused primitive/consumer parity run passed.
- Full repo verification gate passed.

## Commands

- `npm run test:unit -- src/lib/equation/parameterized/math-json.test.ts src/lib/symbolic-engine/primitives/simplification/simplification.test.ts src/lib/equation/parameterized/mixed-algebraic.test.ts src/lib/symbolic-engine/primitives/expansion/expansion.test.ts src/lib/symbolic-engine/primitives/substitution/substitution.test.ts src/lib/equation/polynomial/carrier-follow-on.test.ts src/lib/equation/shared-solve-tests/radicals-and-carriers.test.ts src/lib/symbolic-engine/primitives/factorization/factorization.test.ts src/lib/symbolic-engine/factoring.test.ts src/lib/symbolic-engine/mixed-factor.test.ts src/lib/equation/parameterized/factorable-polynomial.test.ts src/lib/equation/roots/readback.test.ts src/lib/equation/facts/branch-domain-facts.test.ts src/lib/modes/equation/parameterized-search-trace.test.ts`
  - Passed: 14 files, 131 tests.
- `npx tsc -b --pretty false`
  - Passed.
- `npm run test:compartments-boundaries`
  - Passed.
- `npm run test:file-sizes`
  - Passed.
- `npm run test:memory-protocol`
  - Passed.
- `npm run lint`
  - Passed.
- `npm run build`
  - Passed with existing Vite dynamic/static import warnings.
- `git diff --check`
  - Passed.
