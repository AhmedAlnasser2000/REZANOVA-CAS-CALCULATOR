# TRACK CALC-AUDIT0 Manual Verification Checklist

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

- `CALC-AUDIT0` records the current calculus status before new capability work.
- The audit covers:
  - basic `Calculus`
  - `Advanced Calc` integrals
  - finite and infinite limits
  - Maclaurin and Taylor series
  - partial derivatives
  - first-order and second-order ODEs
  - numeric IVP
- A focused Playwright smoke suite now verifies representative browser flows.
- The next recommended milestone is `CALC-CORE1` before `CALC-COMP1`.

## Automation Gate

Primary verification is automated:

```bash
npm run test:unit -- src/lib/calculus-workbench.test.ts src/lib/advanced-calc/integrals.test.ts src/lib/advanced-calc/limits.test.ts src/lib/advanced-calc/series.test.ts src/lib/advanced-calc/partials.test.ts src/lib/advanced-calc/ode.test.ts src/lib/advanced-calc/navigation.test.ts src/lib/advanced-calc/ui.test.ts src/lib/antiderivative-rules.test.ts src/lib/limit-heuristics.test.ts src/lib/symbolic-engine/integration.test.ts src/lib/symbolic-engine/limits.test.ts src/lib/symbolic-engine/partials.test.ts
npx playwright test e2e/calc-audit0-smoke.spec.ts --project=chromium
npx eslint e2e/helpers.ts e2e/calc-audit0-smoke.spec.ts
npm run test:memory-protocol
```

## Manual App Steps

Run these only if a human desktop smoke is desired after automation passes.

### 1. Basic Calculus

1. Open `MENU > Calculus > Calculus`.
2. Open `Derivative`.
3. Enter `x^3+2x`.
4. Press `EXE` or `F1`.

Expected result:
- success result appears
- result has a `Calculus` badge
- derivative output contains an `x` term and no error

### 2. Basic Integral

1. Stay in `Calculus`.
2. Open `Integral`.
3. Keep `Indefinite`.
4. Enter `1/(1+x^2)`.
5. Press `EXE` or `F1`.

Expected result:
- success result appears
- exact output contains `arctan`

### 3. Basic Limit

1. Stay in `Calculus`.
2. Open `Limit`.
3. Enter `sin(x)/x`.
4. Set target to `0`.
5. Press `EXE` or `F1`.

Expected result:
- success result appears
- result is approximately or exactly `1`

### 4. Advanced Integral And Limit

1. Open `MENU > Calculus > Advanced Calc`.
2. Open `Integrals > Indefinite`.
3. Enter `1/(1+x^2)`.
4. Press `EXE` or `F1`.
5. Open `Limits > Finite Target`.
6. Enter `(1-cos(x))/x^2`.
7. Set target to `0`.
8. Press `EXE` or `F1`.

Expected result:
- indefinite integral succeeds with `arctan`
- current known gap: the provenance badge may show generic `Symbolic`; the tracked target behavior is `Rule-based symbolic`
- finite limit succeeds with value near `0.5`

### 5. Advanced Series, Partials, And ODE

1. Open `Series > Maclaurin`.
2. Enter `sin(x)` and run.
3. Open `Partials > First Order`.
4. Enter `x^2y+y^3` and run.
5. Open `ODE > First Order`.
6. Use the default `dy/dx = xy` separable setup and run.
7. Open `ODE > Numeric IVP`.
8. Use the default IVP setup and run.

Expected result:
- Maclaurin result contains `x`
- partial derivative result contains `2xy`
- first-order ODE result contains an exponential form
- numeric IVP returns a successful numeric result

## Pass/Fail

- Automation gate: passed on 2026-04-24.
  - Focused calculus unit baseline: passed.
  - Browser smoke: passed with one intentional `test.fixme` for the Advanced Calc indefinite-integral provenance badge mismatch.
  - ESLint for touched e2e files: passed.
  - Memory protocol: passed.
- Manual smoke: optional after automation.
