# TRACK-INT-RAT2 Manual Verification Checklist

milestone: `INT-RAT2`  
status: verified and committed  
date: 2026-05-22  
primary_agent: codex  
primary_agent_model: gpt-5.5

## What Is Achieved Now

- Extended bounded rational integration through the existing `partial-fractions` strategy.
- Added repeated rational linear support such as `1/(x-1)^2`.
- Added mixed repeated/distinct linear support.
- Added irreducible quadratic support with log/arctan readback when verification accepts it.
- Added mixed linear/quadratic support under the existing rational-function caps.
- Preserved `inverse-trig` and `derivative-ratio` priority before partial fractions.
- Kept `ResultOrigin` values and visible strategy labels unchanged.

## Manual App Steps

- Open Calculate and run `\int \frac{1}{(x-1)^2}\,dx`.
- Open Calculate and run `\int \frac{x+1}{x^2+1}\,dx`.
- Open Advanced Calc > Integrals and run the same two indefinite examples.
- Run a safe definite integral such as `\int_{2}^{3} \frac{1}{(x-1)^2}\,dx`.
- Run a definite integral over an unsafe interval that crosses a denominator zero.

## Expected Results

- Supported repeated/quadratic examples return a rule-based symbolic integral with the existing `Partial fractions` strategy chip.
- Quadratic output may include both log and arctan terms when verification accepts the result.
- Existing inverse-trig examples still show the inverse-trig strategy instead of partial fractions.
- Existing derivative-ratio examples still show the derivative-ratio strategy instead of partial fractions.
- Unsafe finite definite intervals stop before numeric fallback.
- Labs, source mirrors, and Playground runners are not involved.

## Verification Commands

- [x] `npm run test:unit -- src/lib/symbolic-engine/integration.test.ts src/lib/calculus/calculus-core.test.ts src/lib/advanced-calc/integrals.test.ts src/lib/calculus/calculus-strategy.test.ts src/lib/engine/math-engine.test.ts src/lib/modes/calculate.test.ts src/lib/algebra/rational-function-core.test.ts src/lib/algebra/capability-readiness.test.ts src/lib/algebra/simplify-policy.test.ts`
- [x] `npm run test:golden`
- [x] `npm run test:memory-protocol`
- [x] `npm run lint`
- [x] `npm run build`
- [x] `npm run test:ui`

## Commit

```bash
git commit -m "Add INT-RAT2 repeated and quadratic rational integration"
```
