# AREA-SIMPLIFY0 Calcwiz Fit Evaluation

## Fit

`SIMPLIFY-CORE0` is an immediate fit as a small policy substrate. A broad simplification engine is not a fit.

`CALC-RAT-READBACK0` is too narrow because the same issues already touch rational cancellation, power-log normalization, radical/abs simplification, trig identities, and display readback.

`INT-RAT2` should wait until the policy substrate clarifies how repeated/quadratic rational antiderivative forms are compared and displayed.

## Owner Layer

| Concern | Owner |
| --- | --- |
| Form intent and equivalent-form policy | future `SIMPLIFY-CORE0` under algebra/display boundary |
| Exact rational facts and exclusions | `src/lib/algebra/rational-function-core.ts` |
| Domain/range facts | `src/lib/algebra/domain-range-core.ts` |
| Existing rewrite families | current owner modules stay unchanged |
| User-facing output | display/result-envelope adapters |
| Future rational integration consumption | later `INT-RAT2` |

## Bounded Version

The smallest useful version is not a rewrite engine. It is a typed policy helper that can:

- classify original, canonical, and readable forms
- record preserved constraints and required assumptions
- say whether a replacement form is trusted, display-only, or blocked
- provide stop reasons for unproven equivalence or unsafe domain changes

## Stop Reasons

- missing domain assumptions
- denominator exclusion not preserved
- branch change risk
- unproven equivalence
- readability-only form
- unsupported simplification family
- source engine fallback not trusted enough
- cap or complexity budget exceeded

## User Value

Users eventually get clearer exact output: less arbitrary form switching, safer simplification, better explanations for rational/log/arctan results, and fewer cases where Calcwiz looks confident while hiding assumptions.
