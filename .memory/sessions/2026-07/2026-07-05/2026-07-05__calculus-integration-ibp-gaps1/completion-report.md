## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors: user
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live

## Summary

- Implemented `CALCULUS-INTEGRATION-IBP-GAPS1` for indefinite Calculus integration only.
- Added bounded polynomial-times-inverse-trig IBP for `arctan(x)` and `arcsin(x)` with exact polynomial degree up to 4.
- Added bounded affine-polynomial times `sec^2(ax+b)` and `csc^2(ax+b)` IBP for affine polynomial factors.
- Updated `benchmarks/calculus-corpus/integration/` with backend and Playwright visual run evidence for 14 resolved Thomas/Finney next350 findings.

## Boundaries

- No Equation imports.
- No shared Display/schema changes.
- No definite-integral widening.
- No partial antiderivative adoption.
- Higher-degree trig-derivative IBP, broader inverse-trig composition, and broad trig cleanup remain future benchmark-led gates.
