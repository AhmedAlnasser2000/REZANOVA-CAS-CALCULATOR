# TRACK CALC-DIFF1 Manual Verification Checklist

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

- `CALC-DIFF1` strengthens the app-owned differentiation path for powered-function notation, nested chain-rule forms, general powers, and known inverse derivative families.
- Calculate free-form derivatives and guided `Calculus > Derivative` now share derivative strategy metadata.
- Visible derivative strategy badges now appear for supported derivative wins, including `Function power`, `Chain rule`, `General power`, `Inverse trig`, and `Inverse hyperbolic`.
- `sin^2(x)`, nested forms such as `sin^2(cos^3(x))`, and variable-exponent forms such as `cos^{2x}(x)` stay on the app-owned derivative core instead of becoming Compute Engine-only results.
- Known inverse trig and parser-recognized inverse hyperbolic derivative families are supported.
- Generic inverse-function theorem handling for arbitrary `f^{-1}` remains deferred.

## Automation Gate

Primary verification is automated:

```bash
npm run test:unit -- src/lib/symbolic-engine/differentiation.test.ts src/lib/calculus-workbench.test.ts src/lib/math-engine.test.ts src/lib/modes/calculate.test.ts src/lib/calculus-strategy.test.ts src/lib/calculus-core.test.ts src/lib/advanced-calc/integrals.test.ts src/lib/advanced-calc/limits.test.ts
npx eslint src/AppMain.tsx e2e/calc-audit0-smoke.spec.ts src/types/calculator/execution-types.ts src/types/calculator/display-types.ts src/types/calculator/solver-types.ts src/lib/kernel/runtime-envelope.ts src/lib/modes/calculate.ts src/lib/modes/calculate.test.ts src/lib/semantic-planner.ts src/lib/calculus-eval.ts src/lib/math-engine.ts src/lib/calculus-strategy.ts src/lib/calculus-strategy.test.ts src/lib/symbolic-engine/differentiation.ts src/lib/symbolic-engine/differentiation.test.ts
npm run build
npx playwright test e2e/calc-audit0-smoke.spec.ts --project=chromium
npm run test:memory-protocol
```

## Manual App Steps

Run these only if a human smoke is desired after automation passes.

1. Open the main `Calculate` editor.
2. Run `d/dx sin^2(cos^3(x))`.
3. Confirm the result is titled `Derivative` and shows a derivative strategy badge such as `Function power` or `Chain rule`.
4. Open `MENU > Calculus > Calculus > Derivative`.
5. Run `cos^{2x}(x)`.
6. Confirm the result succeeds and shows `General power`.
7. Run `d/dx arcsin(x)`, `d/dx arccos(x)`, and `d/dx arctan(x)`.
8. Confirm these use known inverse-trig derivative forms.
9. Run `d/dx (sin(x))^{-1}`.
10. Confirm it is treated as a reciprocal expression, not as inverse sine.

Expected result:
- powered-function derivatives succeed with app-owned strategy metadata
- nested chain-rule factors are visible in the result
- known inverse families are supported
- derivative strategy badges are visible
- no proof/check status or step-by-step derivation appears
- generic arbitrary inverse-function theorem support remains absent

## Pass/Fail

- Focused derivative/calculus unit gate: passed on 2026-04-25.
- Browser smoke: passed on 2026-04-25.
- ESLint for touched derivative/display files: passed on 2026-04-25.
- Production build: passed on 2026-04-25.
- Memory protocol: passed on 2026-04-25.
- Manual smoke: optional after automation.
