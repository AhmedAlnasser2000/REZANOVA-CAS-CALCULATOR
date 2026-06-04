# TRACK-INEQUALITY-READBACK-COMPOSITION1 Manual Verification Checklist

## Scope

- Equation-only inequality readback and guarded-composition polish.
- Equation symbolic `Exact` mode only.
- Restrictions move into the existing `Valid when` card through `exactSupplementLatex`.
- Finite real composition cap is 4 guarded layers.
- Trig composition means representable two-trig-layer cases, with real periodic interval-family readback.
- Ordered inequalities remain real-domain only when `Complex On`.
- No Approximate inequality sampling, Isolate inequality rearrangement, graphing, chained inequalities, non-Equation adoption, OOE behavior change, or Rust solver execution.

## Manual Checks

- [ ] Confirm `(x-1)/(x+2)>0` shows the main answer only in `Answer` and `x\ne-2` in `Valid when`.
- [ ] Confirm `(x^2-4)/(x-3)<=0` shows `x\ne3` in `Valid when`.
- [ ] Confirm `sqrt(x-1)>=2` shows `x-1\ge0` in `Valid when`.
- [ ] Confirm `ln(x-2)<4` shows `x-2>0` in `Valid when`.
- [ ] Confirm `ln(x)-5<4`, `ln(x)/5<4`, and `-2ln(x)<4` reduce through the log route with the correct relation handling.
- [ ] Confirm `tan(x)>1` shows tangent singularities in `Valid when`.
- [ ] Confirm `Complex On` inequality results show the real-order note in `Valid when`.
- [ ] Confirm proof/detail cards do not duplicate denominator, radicand, log-domain, tangent-singularity, or real-order restrictions.
- [ ] Confirm verbose `Valid when` and proof/detail cards collapse by default when long, expand on click, and do not hide or resize the main `Answer` block.
- [ ] Confirm safe finite nested examples work: `sqrt(abs(x^2-4))<=3`, `ln(sqrt(x^2-1))<4`, `abs(ln(x-1))<2`, and `sqrt(abs(ln(sqrt(x^2-1))))<=2`.
- [ ] Confirm controlled stops for too-deep composition, symbolic thresholds, unsafe radical/log cases, and unsupported inner shapes.
- [ ] Confirm direct affine trig remains stable: `sin(x)>1/2`, `cos(2x)<=0`, and `tan(x)>1`.
- [ ] Confirm representable two-layer trig cases work in radians: `sin(cos(x))>1/2`, `cos(2sin(x))<=0`, and `tan(sin(x))>1`.
- [ ] Confirm safe inner-tangent all-range cases such as `sin(tan(x))<2` return all real with tangent singularities in `Valid when`.
- [ ] Confirm guarded unsupported two-layer trig cases such as `sin(tan(x))<1/2` stop cleanly rather than faking a finite periodic family.

## Regression Commands

```bash
npm run test:unit -- src/lib/equation/equation-inequality.test.ts src/lib/algebra/inequality-core.test.ts src/lib/algebra/inequality-sign-analysis-core.test.ts src/lib/modes/equation.test.ts
npm run test:ui -- src/AppMain.ui.test.tsx
npm run test:memory-protocol
npm run lint
npm run build
```
