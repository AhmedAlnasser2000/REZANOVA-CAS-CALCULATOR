# TRACK-INT-RAT1 Manual Verification Checklist

milestone: `INT-RAT1`
status: complete
date: 2026-05-21
primary_agent: codex
primary_agent_model: gpt-5.5

## Scope

- Add a bounded app-owned rational-integration rule over one-variable exact rational functions.
- Reuse `rational-function-core` and `polynomial-core` for normalization, division, and distinct rational linear partial fractions.
- Add the `partial-fractions` calculus strategy chip while preserving existing `ResultOrigin` values.
- Keep existing `inverse-trig`, `derivative-ratio`, `u-substitution`, direct-rule, by-parts, and Compute Engine paths ahead of or alongside the new rule.
- Route Calculate, Basic Calculus, and Advanced Calc through the shared verified integration path.

## Manual App Steps

- [ ] In Calculate, evaluate `\int \frac{1}{x^2-1}\,dx`.
- [ ] Confirm the result is symbolic/rule-based and shows `Partial fractions`.
- [ ] Confirm the exact result contains logarithms for `x-1` and `x+1`.
- [ ] In Advanced Calc, run the same indefinite integral and confirm the same strategy/result family.
- [ ] Evaluate a safe definite integral such as `\int_2^3 \frac{1}{x^2-1}\,dx` and confirm exact antiderivative evaluation with method/safety details.
- [ ] Evaluate an unsafe interval such as `\int_0^2 \frac{1}{x^2-1}\,dx` and confirm a controlled real-domain stop before numeric fallback.
- [ ] Confirm `\int \frac{1}{1+x^2}\,dx` still shows `Inverse trig`.
- [ ] Confirm `\int \frac{2x+3}{x^2+3x+2}\,dx` still shows `Derivative ratio`.

## Expected Results

- Distinct rational linear partial fractions succeed only after derivative-backed verification.
- Repeated-factor cases remain controlled stops with `square-free-factorization` / `partial-fractions` blockers.
- Irreducible quadratic cases remain controlled stops unless an existing rule already owns them.
- No source mirrors, Playground runners, external CAS engines, or copied external code are used at runtime.
- No broad rational integration, Risch/Liouville engine, resultants, Grobner/elimination, or exact linear algebra is introduced.

## Verification Commands

- [x] `npm run test:unit -- src/lib/symbolic-engine/integration.test.ts src/lib/calculus/calculus-core.test.ts src/lib/advanced-calc/integrals.test.ts src/lib/calculus/calculus-strategy.test.ts src/lib/engine/math-engine.test.ts src/lib/modes/calculate.test.ts src/lib/algebra/rational-function-core.test.ts src/lib/algebra/capability-readiness.test.ts`
- [x] `npm run test:golden`
- [x] `npm run test:memory-protocol`
- [x] `npm run lint`
- [x] `npm run build`

## Verification Notes

- `npm run build` passed with the existing large-chunk warning.
- Optional `npm run test:ui` and Playwright smoke were not run in this checkpoint.
- A coefficient readback polish was included so partial-fraction terms render as `\frac{8}{3}\ln(...)` instead of visually reading like a stray leading integer.

## Deferred

- `POLY-RAT-CORE1` for repeated factors and irreducible quadratic partial fractions.
- Square-free factorization, resultants, Grobner/elimination, exact linear algebra, broad simplification policy, source-mirror execution, and Risch/Liouville-style integration.
