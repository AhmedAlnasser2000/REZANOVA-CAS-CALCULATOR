# TRACK CALC-INT1 Manual Verification Checklist

Date: 2026-04-26

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live

## What Is Achieved Now

- `CALC-INT1` adds a shared finite definite-integral evaluator after `domain-range-CORE1`.
- Calculate free-form definite integrals, guided Basic Calculus definite integrals, and Advanced Calc definite integrals now share the same backend.
- Safe finite definite integrals use verified antiderivatives when available, then evaluate `F(b)-F(a)`.
- Unsupported but apparently safe finite definite integrals still use adaptive Simpson numeric fallback with visible `numeric-fallback` provenance.
- Detected unsafe intervals such as `1/x` on `[-1,1]`, `ln(x)` on `[0,1]`, and endpoint root-denominator hazards stop before numeric fallback.
- Definite-integral results now use existing detail sections for `Integral Method` and `Interval Safety`.
- Advanced improper integrals keep numeric half-infinite behavior, but endpoint domain singularities now stop with a controlled honesty message.
- No new indefinite antiderivative families, `ResultOrigin` values, integral strategy badges, broad improper exactness, or general interval-proof engine are added.

## Automation Gate

Primary verification is automated:

```bash
npm run test:unit -- src/lib/calculus-core.test.ts src/lib/calculus-workbench.test.ts src/lib/advanced-calc/integrals.test.ts src/lib/math-engine.test.ts src/lib/modes/calculate.test.ts src/lib/algebra/domain-range-core.test.ts
npx playwright test e2e/calc-audit0-smoke.spec.ts --project=chromium
npx eslint src/lib/calculus-core.ts src/lib/calculus-core.test.ts src/lib/calculus-eval.ts src/lib/calculus-workbench.ts src/lib/calculus-workbench.test.ts src/lib/advanced-calc/integrals.ts src/lib/advanced-calc/integrals.test.ts src/lib/math-engine.ts src/lib/math-engine.test.ts src/lib/modes/calculate.ts src/lib/modes/calculate.test.ts
npm run build
npm run test:memory-protocol
```

## Manual App Steps

Run these only if a human smoke is desired after automation passes.

1. Open the main `Calculate` editor.
2. Enter `\int_0^1 2x\,dx`.
3. Confirm the result is `1`, shows symbolic provenance, and includes `Integral Method` plus `Interval Safety` detail notes.
4. Enter `\int_0^1 \sin(x^2)\,dx`.
5. Confirm the result is numeric fallback and still returns an approximate finite value near `0.310268`.
6. Enter `\int_{-1}^{1}\frac{1}{x}\,dx`.
7. Confirm the app stops with an interval/domain safety message instead of returning a numeric answer.
8. Open `MENU > Calculus > Advanced Calc > Integrals > Definite`.
9. Run `2x` from `0` to `1`.
10. Confirm Advanced Calc also returns `1` through the shared exact definite-integral path.
11. Open `Advanced Calc > Integrals > Improper`.
12. Run `1/x` from `0` to `+\infty`.
13. Confirm the app stops with a real-domain boundary/convergence-honesty message.

Expected result:
- exact definite integrals are used only when a verified antiderivative and bounded interval safety allow it
- numeric fallback remains available for safe unsupported finite definite integrals
- unsafe intervals and endpoint singularities stop honestly

## Pass/Fail

- Focused calculus/integral unit gate: passed on 2026-04-26.
- Browser smoke: passed on 2026-04-26.
- ESLint for touched calculus/integral/display files: passed on 2026-04-26.
- Production build: passed on 2026-04-26.
- Memory protocol: passed on 2026-04-26.
- Manual smoke: optional after automation.
