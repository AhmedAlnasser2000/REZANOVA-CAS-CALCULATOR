# TRACK-INEQUALITY-STABILITY1 Manual Verification Checklist

## Scope

- Equation-only inequality stability gate.
- Audit and fixes only; no new inequality solving family.
- Harden typed, pasted, copied, and replayed relation operator handling.
- Preserve `Exact` as the only inequality-solving answer mode.
- Preserve `Approximate` as real numeric interval root search for equations.
- Preserve `Isolate` as equation rearrangement only.
- Ordered inequalities remain real-domain only when `Complex On`.

## Manual Checks

- [ ] Type `(x-1)^2 < = 0` in Equation symbolic and confirm it solves as `x=1`.
- [ ] Paste `(x-1)^2<=0`, `(x-1)^2 =< 0`, and `(x-1)^2≤0` and confirm each routes through Equation inequality solving.
- [ ] Confirm valid Equation inequalities do not fall back to the Calculate message about inequalities being visible but not evaluated.
- [ ] Confirm `-2x+5≥-1` solves as `x<=3`.
- [ ] Confirm rational examples keep denominator exclusions in `Valid when`, not proof details.
- [ ] Confirm `ln(sqrt(x^2-1))<4`, `abs(ln(x-1))<2`, and `tan(|5x-4|)>1/2` still solve through existing guarded families.
- [ ] Confirm unsupported chained, multivariable, degree-limit, and nonlinear periodic cases stop with controlled guidance.
- [ ] Confirm `Approximate` and `Isolate` still show mode-specific inequality guidance.
- [ ] Confirm `Complex On` only adds the real-order note and does not change ordered inequality math.

## Regression Commands

```bash
npm run test:unit -- src/lib/input/input-canonicalization.test.ts src/lib/equation/equation-inequality.test.ts src/lib/algebra/inequality-core.test.ts src/lib/algebra/inequality-sign-analysis-core.test.ts src/lib/modes/equation.test.ts
npm run test:ui -- src/AppMain.ui.test.tsx
npm run test:memory-protocol
npm run lint
npm run build
```
