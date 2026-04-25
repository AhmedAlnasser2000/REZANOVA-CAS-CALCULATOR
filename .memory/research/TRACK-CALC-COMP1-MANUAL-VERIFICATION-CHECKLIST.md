# TRACK CALC-COMP1 Manual Verification Checklist

Date: 2026-04-25

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live

## What Is Achieved Now

- `CALC-COMP1` broadens bounded derivative-backed `u`-substitution antiderivatives on the shared Basic/Advanced indefinite-integral backend.
- Supported substitution wins now include selected affine direct cases, exponential, trig, logarithmic, square-root, reciprocal-square-root, and nested verified one-layer composition forms.
- Basic Calculus and Advanced Calc expose visible integration strategy badges for symbolic indefinite-integral wins.
- Calculate editor input is hardened for MathLive definite-integral remnants and plain natural-log paste shapes before execution.
- Result-origin values and antiderivative verification status remain unchanged; verification status stays internal.
- Partial fractions, rational integration, abs/piecewise integration, rationalization, trig substitution, and broad symbolic search remain out of scope.

## Automation Gate

Primary verification is automated:

```bash
npm run test:unit -- src/lib/calculus-core.test.ts src/lib/calculus-workbench.test.ts src/lib/symbolic-engine/integration.test.ts src/lib/advanced-calc/integrals.test.ts src/lib/math-engine.test.ts src/lib/calculus-strategy.test.ts
npx playwright test e2e/calc-audit0-smoke.spec.ts --project=chromium
npx eslint src/AppMain.tsx e2e/calc-audit0-smoke.spec.ts src/types/calculator/execution-types.ts src/types/calculator/display-types.ts src/lib/kernel/runtime-envelope.ts src/lib/modes/calculate.ts src/lib/calculus-eval.ts src/lib/math-engine.ts src/lib/advanced-calc/engine.ts src/lib/calculus-strategy.ts src/lib/calculus-strategy.test.ts src/lib/symbolic-engine/integration.ts src/lib/symbolic-engine/integration.test.ts src/lib/advanced-calc/integrals.test.ts src/lib/math-engine.test.ts
npm run build
npm run test:memory-protocol
```

## Manual App Steps

Run these only if a human smoke is desired after automation passes.

1. Open `MENU > Calculus > Calculus > Integral`.
2. Run `cos(3x+2)`.
3. Confirm the result succeeds and shows `Rule-based symbolic` plus `U-substitution`.
4. Open `MENU > Calculus > Advanced Calc > Integrals > Indefinite`.
5. Run `cos(3x+2)`.
6. Confirm the same symbolic result family and badges.
7. Run `sin(x^2)` and `e^(x^2)`.
8. In the main Calculate editor, paste or produce `\int_{}^{} 2x ln(x^2+1)\,dx`.
9. Confirm it evaluates as an indefinite integral, shows `Rule-based symbolic` plus `U-substitution`, and is titled `Integral`.

Expected result:
- supported COMP1 substitution cases succeed in both Basic and Advanced surfaces
- visible strategy badges appear for symbolic integration wins
- unsupported missing-derivative cases still fail cleanly
- no verification-status badge or step derivation appears
- malformed empty-bound integral editor shapes are repaired before execution

## Pass/Fail

- Focused calculus/symbolic unit gate: passed on 2026-04-25.
- Browser smoke: passed on 2026-04-25.
- ESLint for touched calculus/display files: passed on 2026-04-25.
- Production build: passed on 2026-04-25.
- Memory protocol: passed on 2026-04-25.
- Manual smoke: optional after automation.
