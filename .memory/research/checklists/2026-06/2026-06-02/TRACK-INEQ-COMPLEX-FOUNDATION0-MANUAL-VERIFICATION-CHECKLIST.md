# TRACK-INEQ-COMPLEX-FOUNDATION0 Manual Verification Checklist

## Scope

- [x] Confirm this milestone is audit/readiness only.
- [x] Confirm no solver code, UI code, result schema, history schema, stored-value policy, OOE runtime behavior, or calculator capability changed.
- [x] Confirm product-facing inequality/complex adoption is Equation-first until stable.
- [x] Confirm reusable cores remain the intended architecture beneath the Equation-first product rollout.

## Contract

- [x] Answer-domain vocabulary is recorded: `real`, `complex`, `conditional-real`, `unknown-domain`.
- [x] Solution-kind vocabulary is recorded separately from answer domain.
- [x] Complex output is recorded as opt-in through a future top-header `Complex` toggle.
- [x] Real-first behavior remains the default when the complex toggle is disabled.
- [x] Stored values remain finite real numeric values until a separate milestone changes that policy.

## Substrate Audit

- [x] `assumptions-core` ownership is recorded.
- [x] `branch-core` ownership is recorded.
- [x] `domain-range-core` ownership is recorded.
- [x] Existing `numeric/complex` primitive is recorded as an input to `COMPLEX-CORE1`.
- [x] Current shared `SolveDomainConstraint`, `DisplayOutcome`, Equation answer mode, and OOE provenance shapes are recorded.

## Mode Audit

- [x] Equation real-only and inequality/complex-adjacent behavior is summarized.
- [x] Calculate real-first and relation/complex boundaries are summarized.
- [x] Table real-domain sampling behavior is summarized.
- [x] Calculus, Advanced Calc, Trigonometry, Geometry, Statistics, Matrix, and Vector adoption boundaries are summarized.

## Verification

- [x] `npm run test:memory-protocol`
- [x] `npm run test:unit -- src/lib/algebra/assumptions-core.test.ts src/lib/algebra/branch-core.test.ts src/lib/algebra/domain-range-core.test.ts src/lib/numeric/complex.test.ts`
- [x] `npm run lint`
