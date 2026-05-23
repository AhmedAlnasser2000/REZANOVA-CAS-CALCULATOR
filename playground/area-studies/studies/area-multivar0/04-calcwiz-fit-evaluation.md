# AREA-MULTIVAR0 Calcwiz Fit Evaluation

## Fit

High fit for an internal variable-role substrate.

Calcwiz already prefers bounded cores and explicit mode contracts. A small symbol/role core matches that style better than immediate UI changes or broad multivariable solving.

## Owner Layer

Recommended stable owner:

- `src/lib/algebra/` or `src/lib/engine/` for the role model and symbol discovery helpers

Likely consumers:

- Equation
- Calculate
- Calculus
- Table
- assumption readback
- history replay
- future polynomial-system and elimination adapters

## Bounded Version

`VARIABLE-CORE1` should be internal and metadata-oriented:

- discover symbols
- filter reserved identifiers
- classify requested roles from mode policy
- return ambiguity/unsupported stops
- expose typed metadata for later target selection and replay

It should not perform solving or substitution.

## Stop Reasons

Candidate stop reasons for future implementation:

- `no-symbols`
- `reserved-identifier-only`
- `multiple-target-candidates`
- `target-not-present`
- `unsupported-symbol`
- `stored-value-target-conflict`
- `bound-variable-target-conflict`
- `mode-requires-single-active-variable`
- `parameters-unsupported`

## User Value

The first visible value comes later, but the core prevents dangerous behavior:

- no silent `x` default when `x` and `z` both appear
- no hidden stored-variable substitution
- clearer stops for unsupported multi-symbol requests
- safer path to bivariate elimination and polynomial systems
