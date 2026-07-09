# RUBI-TIER1-SYMBOLIC-COEFFICIENT-CATCHUP1 Verification Summary

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live

## Gate

- label: backend
- label: ui

## Verification Evidence

- Symbolic-engine coverage now includes target-free symbolic affine/direct primitives, positive symbolic-base exponentials, symbolic derivative-present binomial substitution, symbolic by-parts, and symbolic repeated-linear/quadratic rational forms with visible facts.
- Calculus workspace tests cover non-`x` integration variables and parameter protection.
- UI tests cover variable roundtrip through preview/history/runtime and integral-source editing without duplicate answers.
- Exact by-parts outputs for affine trig/exponential cases are exact-rational and `verified-exact`, without decimal leakage.
- File-size ratchet passes after splitting exact by-parts and symbolic rational helpers into separate modules.

## Verification Commands

- `npx vitest run src/lib/symbolic-engine/integration.test.ts src/lib/algebra/rational-function/rational-function-core.test.ts src/lib/calculus/engine/core.test.ts src/lib/calculus/workspace/integrals.test.ts src/lib/calculus/engine/antiderivative-rules.test.ts` (106 tests passed)
- `npx tsc -b --pretty false`
- `npm run test:ui -- src/app/runtime/useCalculusRuntime.ui.test.tsx src/app/workspaces/CalculusIntegralEditorSource.ui.test.tsx` (12 tests passed)
- `node tools/validate-file-sizes.mjs`
- `npm run test:source-mirrors`
- `npm run test:memory-protocol`
- `git diff --check`
