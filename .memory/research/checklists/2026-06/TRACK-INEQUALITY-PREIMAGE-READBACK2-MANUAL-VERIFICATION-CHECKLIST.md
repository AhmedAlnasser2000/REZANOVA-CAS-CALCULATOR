# TRACK-INEQUALITY-PREIMAGE-READBACK2 Manual Verification Checklist

## Scope

- Equation-only inequality preimage/readback polish.
- Equation symbolic `Exact` mode only.
- Abs-affine periodic preimages should flatten to `x`-alone branch families when safe.
- Periodic readback should use calculator-style symbolic shifts.
- Finite rational/nested preimages may extend only through the bounded helper.
- Ordered inequalities remain real-domain only when `Complex On`.
- No Approximate inequality sampling, Isolate inequality rearrangement, graphing, complex ordered inequalities, non-Equation adoption, OOE behavior change, or Rust solver execution.

## Manual Checks

- [ ] Confirm `tan(|5x-4|)>1/2` returns `x`-alone branch families, not only `|5x-4|` distance-family notation.
- [ ] Confirm `sin(|x-4|)>1/2` flattens to `x`-family branch readback.
- [ ] Confirm `cos(|2x+1|)<=0` flattens to `x`-family branch readback.
- [ ] Confirm `tan(|x-4|)/4-55<=4` reduces through numeric shell peeling and keeps tangent singularities in `Valid when`.
- [ ] Confirm `EXACT` mode uses symbolic thresholds such as `\arctan(1/2)`.
- [ ] Confirm `DECIMAL` mode uses rounded threshold readback.
- [ ] Confirm `BOTH` mode keeps an exact main answer with approximate threshold detail.
- [ ] Confirm periodic shifts read as `k\pi`, `2k\pi`, or `\frac{k\pi}{5}` instead of `k\cdot(\pi)` / raw escaped pi text.
- [ ] Confirm tangent singularities, branch-index facts, period/step facts, and real-order notes appear in `Valid when`.
- [ ] Confirm `abs((x-1)/(x+2))<3`, `sqrt((x-1)/(x+2))<=2`, and `ln((x-1)/(x+2))<4` keep denominator exclusions in `Valid when`.
- [ ] Confirm controlled stops for `sin((x-1)/(x+2))>1/2`, `tan(abs((x-1)/(x+2)))>1`, `sin(abs(x^2-4))>1/2`, `tan(sqrt(ln(1/x^2)))<=1`, and `x+y<1`.

## Regression Commands

```bash
npm run test:unit -- src/lib/equation/equation-inequality.test.ts src/lib/algebra/inequality-core.test.ts src/lib/algebra/inequality-sign-analysis-core.test.ts src/lib/modes/equation.test.ts
npm run test:ui -- src/AppMain.ui.test.tsx
npm run test:memory-protocol
npm run lint
npm run build
```
