# RISCH-NORMAN-EXP-ANSATZ1 Verification Summary

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5-codex
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5-codex
- verified_by_agent: codex
- verified_by_agent_model: gpt-5-codex
- attribution_basis: live
- commit_hash: pending

## Verification

- `npx vitest run src/lib/symbolic-engine/integration-risch-norman-exp-ansatz.test.ts src/lib/symbolic-engine/integration-risch-norman-linear-solver.test.ts src/lib/symbolic-engine/integration-risch-norman-coefficient-field.test.ts` - pass
- `npx vitest run src/lib/symbolic-engine/integration-risch-norman-exp-ansatz.test.ts src/lib/symbolic-engine/integration-risch-norman-linear-solver.test.ts src/lib/symbolic-engine/integration-risch-norman-coefficient-field.test.ts src/lib/symbolic-engine/integration-risch-norman-substrate.test.ts src/lib/symbolic-engine/integration.test.ts src/lib/calculus/engine/core.test.ts src/lib/calculus/workspace/integrals.test.ts` - pass
- `npx tsc -b --pretty false` - pass
- `node tools/validate-file-sizes.mjs` - pass
- `git diff --check` - pass

## Focus Evidence

- Solves direct candidates `x^3e^(a*x+b)` and `(c*x^2+d*x+g)e^(a*x+b)`.
- Solves exact numeric and symbolic positive-base candidates such as `x^2 2^(3*x-1)` and `(c*x+d)q^(a*x+b)`.
- Records facts such as slope nonzero plus positive/nonunit base facts.
- Stops decimal bases, non-affine exponents, selected-variable-dependent polynomial residues, and invalid exact bases.
