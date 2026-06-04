# TRACK-COMPLEX-INPUT1 Manual Verification Checklist

Milestone: `COMPLEX-INPUT1`
Date: 2026-06-04

## Scope

- Equation-first imaginary input contract.
- Accept standalone `i` and `\imaginaryI` as the imaginary unit in Equation context.
- Keep `j` deferred.
- Keep Complex Off real-first.
- No complex parser beyond the imaginary unit, no stored complex values, no Approx complex search, no Isolate complex solving, and no non-Equation adoption.

## Manual Checks

- [ ] In Equation Symbolic, type or paste `x+i=0`; input/readback should normalize `i` as the imaginary unit, not as a target parameter.
- [ ] With `Complex Off`, run `x+\imaginaryI=0`; result should give controlled guidance to enable Complex.
- [ ] With `Complex On`, run `x+\imaginaryI=0`; later `COMPLEX-EQUATION3` should solve this route.
- [ ] Type `xi+j=0`; `xi` and `j` should not be rewritten into the imaginary unit.
- [ ] Replay/copy/editor flows should preserve `\imaginaryI` rather than turning it into a raw variable.

## Verification

- [x] `npm run test:unit -- src/lib/input/input-canonicalization.test.ts src/lib/algebra/variable-core.test.ts src/lib/modes/equation.test.ts src/lib/ooe/equation-pilot.test.ts`
