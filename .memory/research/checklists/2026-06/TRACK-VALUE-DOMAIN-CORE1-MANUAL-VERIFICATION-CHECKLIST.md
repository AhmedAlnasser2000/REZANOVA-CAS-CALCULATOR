# TRACK-VALUE-DOMAIN-CORE1 Manual Verification Checklist

## Scope

- [ ] Confirm `VALUE-DOMAIN-CORE1` adds only the shared internal value/domain/fact substrate.
- [ ] Confirm no Equation, Calculate, Table, OOE, history, settings, stored-value, or visible UI behavior changed.
- [ ] Confirm complex and inequality remain separate future rails that share the new value/domain contract.

## Code Review

- [ ] `AnswerDomain` vocabulary is locked to `real`, `complex`, `conditional-real`, and `unknown-domain`.
- [ ] `SolutionKind` vocabulary is locked to exact symbolic, approximate numeric, isolate formula, inequality solution set, and fact-only stop shapes.
- [ ] Value-domain metadata dedupes through the existing assumption fact spine.
- [ ] Existing `SolveDomainConstraint` adapters preserve current domain facts.
- [ ] New inequality and complex fact kinds are scoped, source-tagged, and read back through assumption details.

## Verification

- [ ] `npm run test:unit -- src/lib/algebra/value-domain-core.test.ts src/lib/algebra/assumptions-core.test.ts src/lib/algebra/assumption-readback.test.ts src/lib/algebra/assumption-adapters.test.ts src/lib/algebra/domain-range-core.test.ts src/lib/numeric/complex.test.ts`
- [ ] `npm run test:memory-protocol`
- [ ] `npm run lint`
- [ ] `npm run build`

## Boundaries

- [ ] No top-header `Complex` toggle is implemented in this milestone.
- [ ] No inequality or complex solver adoption is implemented.
- [ ] No stored complex variables are implemented.
- [ ] No `DisplayOutcome`, history, OOE, Rust, or app-state schema change is introduced.
