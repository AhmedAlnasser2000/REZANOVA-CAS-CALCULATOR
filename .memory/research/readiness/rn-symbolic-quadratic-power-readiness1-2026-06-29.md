# RN-SYMBOLIC-QUADRATIC-POWER-READINESS1

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5-codex
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5-codex
- verified_by_agent: codex
- verified_by_agent_model: gpt-5-codex
- attribution_basis: live

## Scope

Readiness only. No repeated symbolic quadratic power is adopted by integration dispatch in this milestone.

## Ready Shape

- Integrand shape: `(A*v+B)/(a*v^2+b*v+c)^p`.
- Supported readiness powers: `p=2` and `p=3`.
- Coefficients: target-free symbolic coefficients with respect to selected variable `v`.
- Generic branch facts: `a\ne0` and `4ac-b^2>0`.

## Required Future Implementation

- Split numerator into a denominator-derivative component plus a residual constant numerator component.
- Reduce residual reciprocal powers by the positive generic quadratic branch recurrence.
- Preserve existing power-one symbolic quadratic rational precedence.
- Emit log/arctan terms with explicit multiplication readback and visible branch facts.
- Prove by route-local rule proof or exact symbolic backcheck; do not adopt by numeric confidence.

## Deferred Stops

- Powers `4+`.
- Multiple symbolic quadratic denominator groups.
- Reducible symbolic branch splitting.
- Negative-discriminant and zero-discriminant symbolic branches.
- Unknown-sign symbolic case splitting.
- Decimal/inexact coefficients.
- Branch-sensitive carriers such as `Abs`.
