# RISCH-NORMAN-SINCOS-ANSATZ1 Verification Summary

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live
- commit_hash: pending

## Verification

- `npx vitest run src/lib/symbolic-engine/integration-risch-norman-sincos-ansatz.test.ts src/lib/symbolic-engine/integration-risch-norman-exp-ansatz.test.ts src/lib/symbolic-engine/integration-risch-norman-linear-solver.test.ts src/lib/symbolic-engine/integration-risch-norman-coefficient-field.test.ts` - pass
- `npx vitest run src/lib/symbolic-engine/integration-risch-norman-sincos-ansatz.test.ts src/lib/symbolic-engine/integration-risch-norman-exp-ansatz.test.ts src/lib/symbolic-engine/integration-risch-norman-linear-solver.test.ts src/lib/symbolic-engine/integration-risch-norman-coefficient-field.test.ts src/lib/symbolic-engine/integration-risch-norman-substrate.test.ts src/lib/symbolic-engine/integration.test.ts src/lib/calculus/engine/core.test.ts src/lib/calculus/workspace/integrals.test.ts` - pass
- `npx tsc -b --pretty false` - pass
- `node tools/validate-file-sizes.mjs` - pass
- `git diff --check` - pass

## Focus Evidence

- Solves `(c*x^2+d)sin(a*x+b)`, `(c*x^2+d*x+g)cos(a*x+b)`, and `x^4sin(a*x+b)` as direct candidates.
- Honors arbitrary selected variables such as `(c*t+d)cos(a*t+b)` with variable `t`.
- Records slope nonzero facts and does not emit decimal coefficients.
- Stops non-affine arguments, unsupported trig heads, extra trig factors, and selected-variable-dependent polynomial residues.
