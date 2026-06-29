# RN-SYMBOLIC-QUADRATIC-BRANCH-FACTS-BASELINE1

Date: 2026-06-29

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5-codex
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5-codex
- verified_by_agent: codex
- verified_by_agent_model: gpt-5-codex
- attribution_basis: live

## Baseline

The live symbolic quadratic rational branch is the generic real irreducible-positive branch:

- denominator: `a*v^2+b*v+c`
- required facts: `a\ne0`, `4ac-b^2>0`
- readback: log derivative part plus arctan residual

This is a conditional generic formula, not automatic case splitting. If the facts do not hold, the user should not read the formula as covering the branch.

## Preserved Precedence

Exact-rational denominators keep existing route precedence:

- reducible exact cases such as `1/(x^2-1)` stay on linear partial fractions
- positive exact cases such as `1/(x^2+1)` may stay on inverse-trig precedence

## Deferred Branches

The following symbolic branches remain unsupported until explicit milestones implement them:

- repeated-linear branch: `4ac-b^2=0`
- negative-discriminant/log branch: `4ac-b^2<0`
- unknown-sign case splitting
- repeated symbolic quadratic powers
- reducible symbolic factorization into linear factors
- multiple symbolic quadratic factors

No Equation-owned branch/domain wrapper is imported into Calculus/RN for this baseline.
