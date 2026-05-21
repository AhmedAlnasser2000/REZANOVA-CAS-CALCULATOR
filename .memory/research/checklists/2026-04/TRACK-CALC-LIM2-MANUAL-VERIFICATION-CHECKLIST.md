# TRACK CALC-LIM2 Manual Verification Checklist

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

- `CALC-LIM2` adds a shared finite-limit target parser for numeric targets and typed directional targets such as `0^+`, `0^{+}`, `0^-`, and `0^{-}`.
- Free-form Calculate limits, guided Basic `Calculus > Limit`, and Advanced Calc finite-target limits now normalize typed directional targets through the same helper.
- Guided target fields store the numeric target while selecting the matching left/right direction when the typed target is complete.
- Finite limits can now return trusted signed infinities as successful results when the sign and direction are clear.
- Proven one-sided asymptote cases such as `lim x -> 0+ 1/x` and `lim x -> 0- 1/x` return `\infty` and `-\infty`.
- Two-sided mismatch cases such as `lim x -> 0 1/x` still stop honestly.
- `ln(x)` at `0+` returns `-\infty`, while `ln(x)` at `0-` remains a real-domain error.
- Removable rational-hole coverage expands through existing rational normalization/cancellation substrates, not a new calculus-local rational simplifier.
- No new `ResultOrigin` values, limit strategy badges, general asymptotic engine, series engine, or multivariable limit support are added.

## Automation Gate

Primary verification is automated:

```bash
npm run test:unit -- src/lib/finite-limit-target.test.ts src/lib/symbolic-engine/limits.test.ts src/lib/calculus-core.test.ts src/lib/calculus-workbench.test.ts src/lib/advanced-calc/limits.test.ts src/lib/math-engine.test.ts src/lib/modes/calculate.test.ts
npx eslint src/lib/finite-limit-target.ts src/lib/finite-limit-target.test.ts src/lib/symbolic-engine/limits.ts src/lib/symbolic-engine/limits.test.ts src/lib/calculus-core.ts src/lib/calculus-core.test.ts src/lib/calculus-workbench.ts src/lib/calculus-workbench.test.ts src/lib/calculus-eval.ts src/lib/advanced-calc/limits.ts src/lib/advanced-calc/limits.test.ts src/lib/math-engine.ts src/lib/math-engine.test.ts src/lib/modes/calculate.ts src/lib/modes/calculate.test.ts src/app/workspaces/CalculateWorkspace.tsx src/app/workspaces/AdvancedCalculusWorkspace.tsx e2e/calc-audit0-smoke.spec.ts
npx playwright test e2e/calc-audit0-smoke.spec.ts --project=chromium
npm run build
npm run test:memory-protocol
```

## Manual App Steps

Run these only if a human smoke is desired after automation passes.

1. Open the main `Calculate` editor.
2. Enter `\lim_{x\to 0^+}\frac{1}{x}`.
3. Confirm the result succeeds as a limit and shows `\infty` with symbolic provenance.
4. Open `MENU > Calculus > Calculus > Limit`.
5. Type target `0^-` into the guided target field.
6. Confirm the direction selector uses the left-hand direction while the target remains numeric `0`.
7. Run `1/x` and confirm the result is `-\infty`.
8. Open `MENU > Calculus > Advanced Calc > Limits > Finite Target`.
9. Run `1/x` with target `0^+`.
10. Confirm the result is `\infty`.
11. Run `(x^3-1)/(x-1)` at target `1`.
12. Confirm the removable hole resolves to `3`.
13. Run `1/x` as a two-sided limit at `0`.
14. Confirm it stops as a left/right mismatch rather than returning a silent answer.

Expected result:
- typed directional targets work across all limit input surfaces
- trusted one-sided divergence returns signed infinity
- two-sided disagreement and real-domain violations remain controlled stops
- rational-hole wins come only through existing rational/cancel substrates

## Pass/Fail

- Focused calculus/limit unit gate: passed on 2026-04-25.
- ESLint for touched limit/calculus/e2e files: passed on 2026-04-25.
- Browser smoke: passed on 2026-04-25.
- Production build: passed on 2026-04-25.
- Memory protocol: passed on 2026-04-25.
- Manual smoke: optional after automation.
