# TRACK-INEQUALITY-EQUATION2 Manual Verification Checklist

## Scope

- Equation-only bounded real polynomial inequality expansion.
- `Exact` mode only.
- Uses `POLYNOMIAL-DOMAIN-CORE1` plus `INEQUALITY-CORE1`.
- No non-Equation adoption, rational sign charts, Approximate inequality sampling, Isolate inequality rearrangement, OOE behavior change, or Rust solver execution.

## Manual Checks

- [ ] Confirm `x^2-4<0`, `x^2-4<=0`, `x^2-4>0`, and `x^2-4>=0` show correct interval unions.
- [ ] Confirm negative leading coefficient cases such as `-x^2+4>=0` flip the sign chart correctly.
- [ ] Confirm repeated-root cases such as `(x-1)^2<=0` and `(x-1)^2>0` are readable.
- [ ] Confirm exact irrational bounds such as `x^2-2<=0` display `sqrt(2)` labels cleanly.
- [ ] Confirm constant true/false polynomial inequalities return all-real or empty-set readback.
- [ ] Confirm unsupported rational, symbolic-parameter, multivariable, trig/log/exp, chained, `!=`, and degree-over-cap inputs stop with controlled guidance.
- [ ] Confirm `Complex On` does not change ordered inequality math and keeps the real-order note.

## Regression Commands

```bash
npm run test:unit -- src/lib/modes/equation.test.ts src/lib/equation/equation-inequality.test.ts src/lib/algebra/inequality-core.test.ts src/lib/algebra/polynomial-domain-core.test.ts
npm run test:ui -- src/AppMain.ui.test.tsx
npm run test:memory-protocol
npm run lint
npm run build
```
