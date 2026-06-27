# RISCH-NORMAN-DISPATCH-PROBE1 Verification Summary

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

- `npx vitest run src/lib/symbolic-engine/integration.test.ts src/lib/symbolic-engine/integration-risch-norman-exp-ansatz.test.ts src/lib/symbolic-engine/integration-risch-norman-sincos-ansatz.test.ts` - pass
- `npx vitest run src/lib/symbolic-engine/integration-risch-norman-log-readiness.test.ts src/lib/symbolic-engine/integration-risch-norman-sincos-ansatz.test.ts src/lib/symbolic-engine/integration-risch-norman-exp-ansatz.test.ts src/lib/symbolic-engine/integration-risch-norman-linear-solver.test.ts src/lib/symbolic-engine/integration-risch-norman-coefficient-field.test.ts src/lib/symbolic-engine/integration-risch-norman-substrate.test.ts src/lib/symbolic-engine/integration.test.ts src/lib/calculus/engine/core.test.ts src/lib/calculus/workspace/integrals.test.ts` - pass
- `npx tsc -b --pretty false` - pass
- `node tools/validate-file-sizes.mjs` - pass
- `npm run test:memory-protocol` - pass
- `git diff --check` - pass

## Focus Evidence

- `(c*x^2+d*x+g)e^(a*x+b)` now adopts through the Risch-Norman exponential ansatz after existing Tier-I routes miss.
- `(c*x+d)q^(a*x+b)` adopts with visible `q>0`, `q-1\ne0`, and `a\ne0` facts.
- `(c*x^2+d)sin(a*x+b)` and `(c*x^2+d*x+g)cos(a*x+b)` adopt through the paired sine/cosine ansatz.
- All new adopted cases keep visible strategy `integration-by-parts`, origin `rule-based-symbolic`, and `verified-exact` rule-proof evidence.
