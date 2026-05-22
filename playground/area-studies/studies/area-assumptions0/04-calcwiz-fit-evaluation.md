# AREA-ASSUMPTIONS0 Calcwiz Fit Evaluation

## Fit

High.

Calcwiz has already accumulated the ingredients: denominator exclusions, domain guards, branch metadata, interval checks, and simplify trust. The missing piece is a shared vocabulary and envelope so these facts can travel across modules.

## Owner Layer

Primary owner: `src/lib/algebra/`.

Adapter owners:

- equations consume facts for candidate validation and transformed-equation honesty
- calculus consumes facts for definite-integral safety, limits, and verified antiderivatives
- display/readback consumes facts for detail sections and warnings
- future tables/graphs consume facts for undefined rows, holes, and discontinuity annotations

## Bounded Version

`ASSUMPTIONS-CORE0`.

The first version should provide:

- `AssumptionFact`
- `DomainExclusionFact`
- `DomainConstraintFact`
- `BranchFact`
- `IntervalHazardFact`
- `TrustFact`
- merge/dedupe helpers
- source-operation tags
- display-safe summary helpers

It should not solve inequalities or infer broad facts from arbitrary expressions.

## Stop Reasons

- unsupported-fact-kind
- unsupported-variable-scope
- unproved-domain-constraint
- branch-policy-missing
- interval-proof-unavailable
- global-assumption-state-forbidden
- fact-propagation-over-cap

## User Value

Users should eventually see fewer mysterious results:

- canceled rational expressions still show exclusions
- equations explain candidate rejection
- definite integrals stop honestly at singularities
- limits explain real-domain one-sided failures
- tables and future graphs can mark undefined points instead of silently pretending continuity
- readable rational/calculus output can keep trust and domain facts visible
