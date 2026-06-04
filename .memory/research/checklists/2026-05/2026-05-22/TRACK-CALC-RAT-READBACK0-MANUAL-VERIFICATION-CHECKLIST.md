# TRACK-CALC-RAT-READBACK0 Manual Verification Checklist

milestone: `CALC-RAT-READBACK0`  
status: implementation verified, awaiting commit approval  
date: 2026-05-22  
primary_agent: codex  
primary_agent_model: gpt-5.5

## What Is Achieved Now

- Polished app-owned partial-fraction integral LaTeX readback without adding new integration families.
- Removed redundant wrapper output from supported distinct-linear, repeated-linear, quadratic, and mixed rational partial-fraction results.
- Kept the existing visible strategy chip as `Partial fractions`.
- Added partial-fraction detail sections for supported indefinite and exact definite rational wins.
- Refreshed Guide content with launchable repeated-linear and quadratic rational integral examples.
- Preserved `inverse-trig` and `derivative-ratio` priority, result origins, source-mirror boundaries, and Playground boundaries.

## Manual App Steps

- Open Calculate and run `\int \frac{3x+5}{(x-1)(x+2)}\,dx`.
- Open Calculate and run `\int \frac{1}{(x-1)^2}\,dx`.
- Open Calculate or Advanced Calc and run `\int \frac{x+1}{x^2+1}\,dx`.
- Open a safe definite rational integral such as `\int_2^3 \frac{1}{(x-1)^2}\,dx`.
- Open Guide and launch the new repeated-linear core Calculus and quadratic Advanced Calc examples.

## Expected Results

- The distinct-linear result reads like `\frac{8}{3}\ln|x-1|+\frac{1}{3}\ln|x+2|`.
- The repeated-linear result reads like `-\frac{1}{x-1}` rather than a negated parenthesized fraction block.
- Quadratic examples show readable log/arctan terms.
- Supported rational wins show a `Partial Fractions` detail section explaining the shared polynomial/rational core and bounded support.
- No new strategy label, result origin, solver behavior, source-mirror use, or Playground runner behavior appears.

## Verification Commands

- [x] `npm run test:unit -- src/lib/symbolic-engine/integration.test.ts src/lib/calculus/calculus-core.test.ts src/lib/advanced-calc/integrals.test.ts src/lib/modes/calculate.test.ts src/lib/guide/content.test.ts`
- [x] `npm run test:golden`
- [x] `npm run test:memory-protocol`
- [x] `npm run lint`
- [x] `npm run build`
- [x] optional: `npm run test:ui -- src/AppMain.ui.test.tsx`

## Commit

Suggested only after explicit user approval:

```bash
git commit -m "Polish CALC-RAT-READBACK0 rational integral readback"
```
