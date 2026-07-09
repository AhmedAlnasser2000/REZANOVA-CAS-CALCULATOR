# ALGEBRAIC-GENUS0-RADICAL-PROFILER1 Verification Summary

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
- status: verified with unrelated file-size blocker noted

## Verification

- `npx vitest run src/lib/symbolic-engine/integration-algebraic-genus0-profile.test.ts`: passed, 5 tests.
- `npx vitest run src/lib/symbolic-engine/integration.test.ts src/lib/calculus/engine/core.test.ts src/lib/calculus/workspace/integrals.test.ts`: passed, 97 tests.
- `npx tsc -b --pretty false`: passed.
- `npm run test:memory-protocol`: passed.
- `git diff --check`: passed.
- `node tools/validate-file-sizes.mjs`: failed on unrelated pre-existing `src/AppMain.tsx` cap drift (`3359` lines versus cap `3357`). This milestone did not touch `src/AppMain.tsx`.

## Focused Cases Covered

- `sqrt(x+1)` profiles as exact-rational affine radical.
- `1/sqrt(x+1)` profiles as exact-rational affine reciprocal radical.
- `sqrt(x^2+1)` profiles as exact-rational quadratic radical.
- `sqrt(a*x^2+b*x+c)` profiles as target-free symbolic quadratic radical.
- `sqrt(a*t^2+x*t+b)` with variable `t` treats `x` as target-free.
- `(x+sqrt(x^2+1))/(x-1)` profiles as rational-in-radical.
- `sqrt(x+sqrt(x+1))`, `sqrt(x)+sqrt(x+1)`, `sqrt(0.5*x+1)`, `|x|sqrt(x+1)`, cubic/quartic radicands, and over-cap radicands stop explicitly.
