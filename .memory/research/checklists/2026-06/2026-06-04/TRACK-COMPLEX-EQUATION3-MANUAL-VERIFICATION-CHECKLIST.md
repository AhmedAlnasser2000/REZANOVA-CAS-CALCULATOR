# TRACK-COMPLEX-EQUATION3 Manual Verification Checklist

Milestone: `COMPLEX-EQUATION3`
Date: 2026-06-04

## Scope

- Equation-only product adoption.
- `Exact + Complex On` algebraic complex engine.
- Consumes `COMPLEX-INPUT1` explicit imaginary input contract.
- Supports direct explicit imaginary linear equations, bounded factorable polynomial equations through degree 4, selected-target power carriers, and supported rational equations by numerator roots plus denominator exclusions.
- Respects `EXACT`, `DECIMAL`, and `BOTH` output style for complex branch readback where approximate branch values are available.

## Manual Checks

- [ ] With `Complex On`, `x+\imaginaryI=0` returns `x in {-i}` and does not expose `i` as a target or parameter.
- [ ] With `Complex On`, `x-(2+3\imaginaryI)=0` returns `x in {2+3i}`.
- [ ] With `Complex Off`, explicit imaginary input still gives controlled guidance to enable Complex.
- [ ] With `Complex On`, `x^2+1=0` returns `x in {-i, i}`.
- [ ] With `Complex On`, `(x-1)(x^2+1)=0` returns mixed real and imaginary branches.
- [ ] With `Complex On`, `(x^2+1)/(x-2)=0` returns numerator roots and shows `x-2 != 0` in `Valid when`.
- [ ] With `Complex On`, `x^4-16=0` returns the real roots plus imaginary roots; with `Complex Off`, current real-first behavior remains unchanged.
- [ ] `EXACT` keeps symbolic complex branches as the main answer.
- [ ] `DECIMAL` uses approximate branch display where available.
- [ ] `BOTH` keeps exact branches in the main answer and shows approximate complex readback as secondary text.
- [ ] Unfactorable cubic/quartic equations stop with guidance rather than fake numeric exact roots.
- [ ] `Approximate` remains real numeric interval solving for equations only.
- [ ] `Isolate` remains textbook rearrangement and does not claim complex solving.

## Boundaries

- [ ] No stored complex values.
- [ ] No non-Equation adoption.
- [ ] No complex Approximate search.
- [ ] No Isolate complex solving.
- [ ] No Cardano/Ferrari unfactorable cubic/quartic formulas.
- [ ] No complex trig/log/exp route.
- [ ] No OOE behavior change.
- [ ] No Rust solver execution.

## Verification

- [x] `npm run test:unit -- src/lib/equation/equation-complex.test.ts`
- [x] `npm run test:unit -- src/lib/input/input-canonicalization.test.ts src/lib/modes/equation.test.ts src/lib/equation/equation-complex.test.ts src/lib/numeric/complex.test.ts src/lib/algebra/value-domain-core.test.ts src/lib/ooe/equation-pilot.test.ts src/app/logic/runtimeControllers.test.ts`
