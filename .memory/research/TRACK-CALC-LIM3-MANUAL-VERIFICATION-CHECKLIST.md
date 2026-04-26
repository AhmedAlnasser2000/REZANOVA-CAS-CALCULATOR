# TRACK CALC-LIM3 Manual Verification Checklist

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

- `CALC-LIM3` is implemented as one run with three internal slices:
  - `LIM3A`: rational/local-order finite limits and bounded rational dominance at infinity
  - `LIM3B`: bounded elementary-equivalent finite-limit products and quotients
  - `LIM3C`: accurate limit method detail notes on the existing detail-section surface
- Finite rational limits now handle stronger removable holes such as `3x/(x+x^2)` and `(x^3-1)/(x^2-1)`.
- Signed finite poles after local simplification can return trusted one-sided infinities while preserving two-sided mismatch stops.
- Bounded rational dominance at `+infinity` and `-infinity` now returns signed infinity when leading behavior determines the sign.
- Elementary-equivalent products such as `ln(1+x)sin(x)/x^2`, `(1-cos(2x))/x^2`, and `sin(3x)/x` resolve as rule-based symbolic wins.
- Limit method detail notes explain rational cancellation, local equivalents, signed pole behavior, rational dominance, or numeric fallback sampling.
- No new `ResultOrigin` values, visible limit strategy badges, general series engine, broad asymptotic engine, multivariable limit support, speculative search, or Playground dependency are added.

## Automation Gate

Primary verification is automated:

```bash
npm run test:unit -- src/lib/symbolic-engine/limits.test.ts src/lib/limit-heuristics.test.ts src/lib/calculus-core.test.ts src/lib/calculus-workbench.test.ts src/lib/advanced-calc/limits.test.ts src/lib/math-engine.test.ts src/lib/modes/calculate.test.ts
npx playwright test e2e/calc-audit0-smoke.spec.ts --project=chromium
npx eslint src/lib/symbolic-engine/limits.ts src/lib/symbolic-engine/limits.test.ts src/lib/limit-heuristics.ts src/lib/limit-heuristics.test.ts src/lib/calculus-core.ts src/lib/calculus-core.test.ts src/lib/math-engine.ts src/lib/math-engine.test.ts src/lib/modes/calculate.ts src/lib/modes/calculate.test.ts e2e/calc-audit0-smoke.spec.ts
npm run build
npm run test:memory-protocol
```

## Manual App Steps

Run these only if a human smoke is desired after automation passes.

1. Open the main `Calculate` editor.
2. Enter `\lim_{x\to 0^-}\frac{3x}{x+x^2}`.
3. Confirm the result is `3`, shows `Rule-based symbolic`, and includes a `Limit Method` detail note mentioning rational normalization/cancellation.
4. Open `MENU > Calculus > Advanced Calc > Limits > Finite Target`.
5. Run `\frac{\ln(1+x)\sin(x)}{x^2}` at target `0`.
6. Confirm the result is `1`, shows `Rule-based symbolic`, and includes a `Limit Method` detail note mentioning local orders.
7. Run `\frac{x+1}{x^3}` at target `0^+`.
8. Confirm the result is `\infty`.
9. Run `\frac{x}{x^2}` as a two-sided target at `0`.
10. Confirm it stops as a left/right mismatch.
11. Run an infinite-target rational dominance case such as `\lim_{x\to-\infty}\frac{x^2+1}{x+5}`.
12. Confirm the result is `-\infty` with a rational-dominance detail note.

Expected result:
- stronger rational/local-order and elementary-equivalent forms resolve symbolically
- unsafe two-sided/domain/oscillatory cases still stop honestly
- detail notes are accurate and explanatory rather than new badges

## Pass/Fail

- Focused calculus/limit unit gate: passed on 2026-04-25.
- Browser smoke: passed on 2026-04-25.
- ESLint for touched limit/calculus/e2e files: passed on 2026-04-25.
- Production build: passed on 2026-04-25.
- Memory protocol: passed on 2026-04-25.
- Manual smoke: optional after automation.
