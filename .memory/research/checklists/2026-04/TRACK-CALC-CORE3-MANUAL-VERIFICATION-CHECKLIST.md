# TRACK CALC-CORE3 Manual Verification Checklist

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

- `CALC-CORE3` removes the Advanced-only indefinite-integral symbolic rule fallback.
- Basic `Calculus` and `Advanced Calc` now use the same app-owned symbolic integration backend for shared indefinite-integral behavior.
- Advanced-only improper integrals, series, partials, ODE, and numeric IVP remain separate workflows.
- The previous Advanced high-degree polynomial-times-exponential/trig by-parts cap is preserved by moving that bounded behavior into the shared symbolic integration core.
- No public result-origin values, display contracts, or visible strategy badges are added.

## Automation Gate

Primary verification is automated:

```bash
npm run test:unit -- src/lib/calculus-core.test.ts src/lib/calculus-workbench.test.ts src/lib/symbolic-engine/integration.test.ts src/lib/advanced-calc/integrals.test.ts src/lib/math-engine.test.ts
npx playwright test e2e/calc-audit0-smoke.spec.ts --project=chromium
npx eslint src/lib/calculus-core.ts src/lib/calculus-eval.ts src/lib/symbolic-engine/integration.ts src/lib/symbolic-engine/integration.test.ts src/lib/advanced-calc/integrals.ts src/lib/advanced-calc/integrals.test.ts
npm run build
npm run test:memory-protocol
```

## Manual App Steps

Run these only if a human smoke is desired after automation passes.

1. Open `MENU > Calculus > Calculus`.
2. Run the integral tool with `1/(1+x^2)`.
3. Run the integral tool with `x^5e^x`.
4. Open `MENU > Calculus > Advanced Calc > Integrals > Indefinite`.
5. Run `1/(1+x^2)`.
6. Run `x^5e^x`.
7. Run `sin(x^2)`.

Expected result:
- Basic and Advanced both return symbolic results for the shared supported cases.
- Advanced `1/(1+x^2)` still shows `Rule-based symbolic`.
- Advanced `x^5e^x` remains supported after deleting the private Advanced rule stack.
- `sin(x^2)` still fails cleanly as unsupported.
- no new visible strategy badge appears in the UI.

## Pass/Fail

- Focused calculus/symbolic unit gate: passed on 2026-04-25.
- Browser smoke: passed on 2026-04-25.
- ESLint for touched calculus files: passed on 2026-04-25.
- Production build: passed on 2026-04-25.
- Memory protocol: passed on 2026-04-25.
- Manual smoke: optional after automation.
