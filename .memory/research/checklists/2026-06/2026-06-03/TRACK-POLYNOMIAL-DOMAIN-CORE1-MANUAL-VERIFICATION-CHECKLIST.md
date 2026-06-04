# TRACK-POLYNOMIAL-DOMAIN-CORE1 Manual Verification Checklist

## Scope

- Pure internal classifier over existing polynomial/rational primitives.
- No Equation adoption, UI changes, history changes, OOE changes, or new solver capability.

## Manual Checks

- [ ] Confirm polynomial classification covers zero, constant, linear, quadratic, cubic, quartic, sparse powers, and rational numeric coefficients.
- [ ] Confirm rational classification reports numerator/denominator metadata and denominator nonzero facts.
- [ ] Confirm rejection cases stay controlled: multivariable, unsupported coefficients, unsupported functions, negative powers, malformed input, and over-cap degree.
- [ ] Confirm `polynomial-domain-core` facts use the existing assumption spine.
- [ ] Confirm no result card, history, Equation route, OOE envelope, or UI behavior changes are visible.

## Regression Commands

```bash
npm run test:unit -- src/lib/algebra/polynomial-domain-core.test.ts src/lib/algebra/polynomial-core.test.ts src/lib/algebra/rational-function-core.test.ts src/lib/algebra/assumptions-core.test.ts src/lib/algebra/value-domain-core.test.ts
npm run test:memory-protocol
npm run lint
npm run build
```
