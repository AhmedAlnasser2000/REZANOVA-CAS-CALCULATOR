# TRACK-COMPLEX-CORE1 Manual Verification Checklist

## Scope

- [ ] Confirm `COMPLEX-CORE1` extends only the internal numeric complex primitive and readback helpers.
- [ ] Confirm no top-header `Complex` toggle is added.
- [ ] Confirm no Equation, Calculate, Table, OOE, history, settings, stored-value, or visible UI behavior changes.
- [ ] Confirm complex user-input parsing remains deferred.

## Code Review

- [ ] Existing complex arithmetic and formatting behavior remains stable.
- [ ] Complex conjugate, argument, polar construction, integer powers, principal nth roots, and all nth roots are implemented.
- [ ] All nth roots normalize near-zero components and sort deterministically by angle.
- [ ] Invalid root degrees and non-integer powers fail predictably.
- [ ] Root/branch readback helpers distinguish principal root from all branch values without claiming Equation solving.
- [ ] Complex-domain metadata can describe branch readback through the shared value/domain fact spine.

## Verification

- [ ] `npm run test:unit -- src/lib/numeric/complex.test.ts src/lib/algebra/value-domain-core.test.ts src/lib/algebra/assumption-readback.test.ts`
- [ ] `npm run test:memory-protocol`
- [ ] `npm run lint`
- [ ] `npm run build`

## Boundaries

- [ ] No complex parser is implemented in this milestone.
- [ ] No complex stored values are implemented.
- [ ] No complex Approximate search is implemented.
- [ ] No product-facing complex adoption outside Equation is implemented.
