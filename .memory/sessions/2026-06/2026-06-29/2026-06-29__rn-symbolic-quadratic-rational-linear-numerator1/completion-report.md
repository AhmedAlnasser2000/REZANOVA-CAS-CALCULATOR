# RN-SYMBOLIC-QUADRATIC-RATIONAL-LINEAR-NUMERATOR1 Completion Report

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5-codex
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5-codex
- verified_by_agent: codex
- verified_by_agent_model: gpt-5-codex
- attribution_basis: live

## Summary

- Added proof-based symbolic support for `(A*v+B)/(a*v^2+b*v+c)`.
- Preserved the existing reciprocal symbolic quadratic route for `1/(a*v^2+b*v+c)`.
- Added a derivative-numerator special case for `(2a*v+b)/(a*v^2+b*v+c)` that returns the log form without an arctan residual.
- Kept visible strategy as `partial-fractions` with facts `a\ne0` and `4ac-b^2>0`.

## Scope Notes

- Generic positive symbolic quadratic branch only.
- No repeated powers, reducible branch splitting, negative-discriminant branch, broad symbolic partial fractions, public schema change, or Display change.
