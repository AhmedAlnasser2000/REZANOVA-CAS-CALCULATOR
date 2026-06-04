# TRACK-COMPLEX-READBACK-STABILITY1 Manual Verification Checklist

Milestone: `COMPLEX-READBACK-STABILITY1`
Date: 2026-06-04

## Scope

- Equation-only complex readback and analysis stability.
- `i` and `\imaginaryI` are visible reserved imaginary units.
- Complex branches get bounded final readback cleanup before display.
- No new complex solver family, no complex trig/log/exp solving, no stored complex values, no Approximate complex search, and no Isolate complex solving.

## Manual Checks

- [ ] In Equation symbolic input, type `x+i=0`; the hint strip shows `x target` and `i reserved unit`.
- [ ] In Equation symbolic input, type `x+\imaginaryI=0`; the hint strip shows `i reserved unit`, not `i parameter`.
- [ ] With `Complex Off`, `x+i=0` stops with controlled guidance to enable Complex.
- [ ] With `Complex On`, `x+i=0` returns a clean `x in {-i}` style answer.
- [ ] With `Complex On`, `x-(2+3i)=0` keeps conventional rectangular readback such as `2+3i`.
- [ ] With `Complex On`, `x^4+i=0` does not expose construction artifacts such as `(\sqrt[4]{-i})i`.
- [ ] With `Complex On`, awkward exact fourth roots may use clean `cis(...)` branch notation.
- [ ] `EXACT` keeps exact branch readback in the main answer.
- [ ] `DECIMAL` shows approximate rectangular complex branches.
- [ ] `BOTH` keeps exact main branches and exposes approximate branch readback as secondary text/details.
- [ ] `x^4+1=0`, `x^3+8=0`, `x^4-16=0`, and `x^2+1=0` keep stable readable branch order.
- [ ] Result chips still show `Domain: Complex` without duplicate `Domain intent: Complex`.
- [ ] History replay and `To Editor` preserve imaginary-unit readback.

## Boundaries

- [ ] `j` and `k` remain ordinary symbols.
- [ ] No reserved-symbol override syntax exists yet.
- [ ] No stored complex values are accepted.
- [ ] No complex Approximate search is added.
- [ ] No Isolate complex solving is added.
- [ ] No complex trig/log/exp solving is added.
- [ ] No non-Equation complex adoption is added.
- [ ] No OOE runtime behavior changes are included.

## Verification

- [x] `npm run test:unit -- src/lib/algebra/variable-core.test.ts src/lib/algebra/variable-hints.test.ts src/lib/equation/equation-target.test.ts src/lib/equation/equation-complex.test.ts`
- [x] `npm run test:unit -- src/lib/algebra/variable-hints.test.ts src/lib/equation/equation-complex.test.ts src/lib/numeric/complex.test.ts src/lib/modes/equation.test.ts`
- [x] `npm run test:ui -- src/AppMain.ui.test.tsx src/components/VariableHintStrip.ui.test.tsx`
- [x] `npm run test:memory-protocol`
- [x] `npm run lint`
- [x] `npm run build`
