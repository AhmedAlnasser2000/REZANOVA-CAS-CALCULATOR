# TRACK CALC-CORE2 Manual Verification Checklist

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

- `CALC-CORE2` adds internal derivative backchecks for candidate antiderivatives.
- Existing symbolic integration wins now carry internal strategy metadata.
- The dependency matrix records when future calculus milestones may proceed and when they must stop for algebra/core prerequisites.
- No new calculus behavior, public result-origin value, or visible UI badge is added.

## Automation Gate

Primary verification is automated:

```bash
npm run test:unit -- src/lib/calculus-core.test.ts src/lib/calculus-workbench.test.ts src/lib/symbolic-engine/differentiation.test.ts src/lib/symbolic-engine/integration.test.ts src/lib/advanced-calc/integrals.test.ts src/lib/advanced-calc/limits.test.ts src/lib/math-engine.test.ts
npx playwright test e2e/calc-audit0-smoke.spec.ts --project=chromium
npm run build
npx eslint src/lib/calculus-core.ts src/lib/calculus-verification.ts src/lib/symbolic-engine/differentiation.ts src/lib/symbolic-engine/integration.ts src/lib/symbolic-engine/integration.test.ts src/lib/calculus-core.test.ts
npm run test:memory-protocol
```

## Manual App Steps

Run these only if a human smoke is desired after automation passes.

1. Open `MENU > Calculus > Calculus`.
2. Run the existing derivative, integral, and limit smoke examples from `CALC-AUDIT0`.
3. Open `MENU > Calculus > Advanced Calc > Integrals > Indefinite`.
4. Run `1/(1+x^2)`.
5. Run `xe^x`.
6. Run `sin(x^2)`.

Expected result:
- shipped successes remain successful
- `1/(1+x^2)` still shows `Rule-based symbolic`
- `xe^x` remains supported
- `sin(x^2)` still fails cleanly as unsupported
- no new strategy badge appears in the UI

## Pass/Fail

- Automation gate: passed on 2026-04-24.
  - Focused calculus/symbolic unit gate: passed.
  - Browser smoke: passed.
  - Production build: passed.
  - ESLint for touched calculus files: passed.
  - Memory protocol: passed.
- Manual smoke: optional after automation.
