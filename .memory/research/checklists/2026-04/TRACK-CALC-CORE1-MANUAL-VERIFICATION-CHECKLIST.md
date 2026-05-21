# TRACK CALC-CORE1 Manual Verification Checklist

Date: 2026-04-24

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live

## What Is Achieved Now

- Basic `Calculus` and `Advanced Calc` now share a narrow calculus evaluation boundary for:
  - indefinite-integral result ordering and provenance
  - finite-limit numeric classification
  - infinite-limit heuristic/fallback classification
  - numeric definite-integral fallback
- No new calculus capability is intentionally added.
- The `CALC-AUDIT0` provenance gap is resolved:
  - Advanced Calc indefinite integral of `1/(1+x^2)` now shows `Rule-based symbolic`.
- The next capability milestone remains `CALC-COMP1`.

## Automation Gate

Primary verification is automated:

```bash
npm run test:unit -- src/lib/calculus-core.test.ts src/lib/calculus-workbench.test.ts src/lib/advanced-calc/integrals.test.ts src/lib/advanced-calc/limits.test.ts src/lib/advanced-calc/series.test.ts src/lib/advanced-calc/partials.test.ts src/lib/advanced-calc/ode.test.ts src/lib/advanced-calc/navigation.test.ts src/lib/advanced-calc/ui.test.ts src/lib/antiderivative-rules.test.ts src/lib/limit-heuristics.test.ts src/lib/symbolic-engine/integration.test.ts src/lib/symbolic-engine/limits.test.ts src/lib/symbolic-engine/partials.test.ts src/lib/math-engine.test.ts
npm run build
npx playwright test e2e/calc-audit0-smoke.spec.ts --project=chromium
npx eslint src/lib/calculus-core.ts src/lib/calculus-core.test.ts src/lib/calculus-eval.ts src/lib/advanced-calc/integrals.ts src/lib/advanced-calc/integrals.test.ts src/lib/advanced-calc/limits.ts src/lib/advanced-calc/limits.test.ts e2e/calc-audit0-smoke.spec.ts e2e/helpers.ts
npm run test:memory-protocol
```

## Manual App Steps

Run these only if a human desktop smoke is desired after automation passes.

### 1. Advanced Integral Provenance

1. Open `MENU > Calculus > Advanced Calc`.
2. Open `Integrals > Indefinite`.
3. Enter `1/(1+x^2)`.
4. Press `EXE` or `F1`.

Expected result:
- success result appears
- exact output contains `arctan`
- result badge shows `Rule-based symbolic`

### 2. Shared Limit Classification

1. Open `Limits > Finite Target`.
2. Enter `(1-cos(x))/x^2`.
3. Keep target `0`.
4. Press `EXE` or `F1`.

Expected result:
- success result appears
- result value is near `0.5`
- result badge shows `Heuristic symbolic`

### 3. Basic Calculus Still Works

1. Open `MENU > Calculus > Calculus`.
2. Run `Derivative` on `x^3+2x`.
3. Run `Integral` on `1/(1+x^2)`.
4. Run `Limit` on `sin(x)/x` with target `0`.

Expected result:
- derivative succeeds
- integral contains `arctan`
- limit is exactly or approximately `1`

## Pass/Fail

- Automation gate: passed on 2026-04-24.
  - Focused calculus and shared-core unit baseline: passed.
  - Production build: passed.
  - Browser smoke: passed.
  - ESLint for touched calculus/e2e files: passed.
  - Memory protocol: passed.
- Manual smoke: optional after automation.
