# TRACK-INEQUALITY-EQUATION3 Manual Verification Checklist

## Scope

- Equation-only unified real inequality decision engine.
- Equation symbolic `Exact` mode only.
- Proof contract: Exact Guarded.
- Supports exact roots/critical points and guarded sign-cell sampling.
- Ordered inequalities remain real-domain only when `Complex On`.
- No Approximate inequality sampling, Isolate inequality rearrangement, non-Equation adoption, OOE behavior change, graphing, or Rust solver execution.

## Manual Checks

- [ ] Confirm polynomial cases still work: `x^2-4<0`, `(x-1)^2<=0`, `x^2+1<0`, and `x^2-2<=0`.
- [ ] Confirm rational cases work and show denominator facts: `(x-1)/(x+2)>0` and `(x^2-4)/(x-3)<=0`.
- [ ] Confirm absolute-value cases work: `|x-2|<3`, `|2x+1|>=5`, and `|x^2-1|<2`.
- [ ] Confirm guarded radical cases work: `sqrt(x-1)>=2` and `sqrt(x^2-1)<=3`.
- [ ] Confirm monotone log/exp cases work: `ln(x-2)<4` and `e^x>=5`.
- [ ] Confirm direct affine trig cases read back as periodic families: `sin(x)>1/2`, `cos(2x)<=0`, and `tan(x)>1`.
- [ ] Confirm unsupported symbolic-parameter, multivariable, chained, `!=`, too-deep, and non-affine trig inputs stop with controlled guidance.
- [ ] Confirm `Approximate` and `Isolate` keep inequality-specific guidance instead of solving.
- [ ] Confirm `Complex On` keeps ordered inequalities on the real line and shows the real-order note.

## Regression Commands

```bash
npm run test:unit -- src/lib/equation/equation-inequality.test.ts src/lib/algebra/inequality-core.test.ts src/lib/algebra/inequality-sign-analysis-core.test.ts
npm run test:unit -- src/lib/modes/equation.test.ts
npm run test:ui -- src/AppMain.ui.test.tsx
npm run test:memory-protocol
npm run lint
npm run build
```
