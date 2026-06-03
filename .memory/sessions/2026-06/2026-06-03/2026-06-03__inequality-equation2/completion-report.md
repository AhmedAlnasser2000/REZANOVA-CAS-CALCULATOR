# INEQUALITY-EQUATION2 Completion Report

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5
- contributors:
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5
- attribution_basis: live

## Summary

Implemented `INEQUALITY-EQUATION2` as the second bounded Equation inequality route.

Equation symbolic `Exact` mode now solves one-variable numeric-coefficient polynomial inequalities through degree 4 when the real roots are available through the bounded exact path. The route uses `POLYNOMIAL-DOMAIN-CORE1` for zero-form classification and `INEQUALITY-CORE1` for interval-union readback.

## User-Facing Behavior

- Quadratic inequalities such as `x^2-4<0`, `x^2-4<=0`, `x^2-4>0`, and `x^2-4>=0` return real interval unions.
- Negative leading coefficients and repeated roots are handled through sign-chart sampling.
- Constant true/false polynomial inequalities return all-real or empty-set results.
- Exact irrational bounds can carry readable LaTeX labels such as `sqrt(2)`.
- Successful results remain `answerDomain: conditional-real` and `solutionKind: inequality-solution-set`.
- `Complex On` keeps ordered inequalities real-domain-only with the existing real-order note.

## Boundaries Preserved

- No rational sign-chart route.
- No symbolic-parameter inequality solving.
- No multivariable inequality solving.
- No trig/log/exp/absolute-value inequality solving.
- No chained inequality route.
- No `!=` route.
- No Approximate inequality sampling.
- No Isolate inequality rearrangement.
- No non-Equation adoption.
- No stored-value policy change.
- No OOE runtime behavior change.
- No Rust solver execution.

## Next

Future inequality work can consider a deliberately scoped rational sign-chart route, but only after the polynomial route is manually stable.
