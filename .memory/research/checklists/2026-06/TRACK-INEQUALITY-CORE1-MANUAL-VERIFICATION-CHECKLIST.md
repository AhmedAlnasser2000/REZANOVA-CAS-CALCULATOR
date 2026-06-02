# TRACK-INEQUALITY-CORE1 Manual Verification Checklist

## Scope

- [ ] Confirm `INEQUALITY-CORE1` adds only a pure internal interval/fact substrate.
- [ ] Confirm no user-input, LaTeX, or MathJSON inequality parser is added.
- [ ] Confirm no Equation, Calculate, Table, OOE, history, settings, stored-value, or visible UI behavior changed.
- [ ] Confirm product-facing inequality adoption remains deferred to a later Equation milestone.

## Code Review

- [ ] `InequalityInterval` and `InequalitySet` represent finite unions of real one-variable intervals.
- [ ] Constructors cover all real, empty, point, open/closed intervals, less-than, less-than-or-equal, greater-than, and greater-than-or-equal shapes.
- [ ] Normalization sorts, dedupes, merges overlapping intervals, and merges compatible touching intervals.
- [ ] Malformed variables and bounds are rejected predictably.
- [ ] Intersection, containment, empty-set detection, and equality helpers are deterministic.
- [ ] Text and LaTeX readback are stable for simple intervals and finite unions.
- [ ] Inequality sets can flow into `VALUE-DOMAIN-CORE1` through `inequality-core` assumption facts.

## Verification

- [ ] `npm run test:unit -- src/lib/algebra/inequality-core.test.ts src/lib/algebra/value-domain-core.test.ts src/lib/algebra/assumption-readback.test.ts src/lib/algebra/domain-range-core.test.ts`
- [ ] `npm run test:memory-protocol`
- [ ] `npm run lint`
- [ ] `npm run build`

## Boundaries

- [ ] No broad nonlinear inequality solver is implemented.
- [ ] No piecewise engine or graphing behavior is implemented.
- [ ] No public assumptions UI is implemented.
- [ ] No stored complex/inequality variable policy is changed.
