# TRACK-COMPLEX-EQUATION2 Manual Verification Checklist

## Scope

- Equation-only bounded opt-in complex polynomial/power answer expansion.
- `Exact + Complex On` only.
- Uses `POLYNOMIAL-DOMAIN-CORE1`, existing bounded factorization, and `COMPLEX-CORE1` readback conventions.
- No complex parser, Approximate complex search, Isolate complex solving, stored complex values, non-Equation adoption, OOE behavior change, or Rust solver execution.

## Manual Checks

- [ ] Confirm `Complex Off` keeps real-first behavior for complex-only equations.
- [ ] Confirm `x^2+2x+5=0` with `Complex On` returns exact complex branches.
- [ ] Confirm mixed factorable equations such as `(x-1)(x^2+1)=0` return real and complex branches.
- [ ] Confirm selected-target power routes such as `x^3+8=0` and `x^4+1=0` remain bounded and symbolic.
- [ ] Confirm unfactorable cubic/quartic equations stop with guidance instead of numeric-only fake exact answers.
- [ ] Confirm `Approximate` remains real interval solving only.
- [ ] Confirm `Isolate` remains textbook rearrangement and does not claim complex solving.

## Regression Commands

```bash
npm run test:unit -- src/lib/modes/equation.test.ts src/lib/equation/equation-complex.test.ts src/lib/numeric/complex.test.ts src/lib/algebra/polynomial-domain-core.test.ts
npm run test:ui -- src/AppMain.ui.test.tsx
npm run test:memory-protocol
npm run lint
npm run build
```
