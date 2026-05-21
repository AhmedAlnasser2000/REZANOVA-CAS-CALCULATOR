# INT-RAT1 Completion Report

date: 2026-05-21
primary_agent: codex
primary_agent_model: gpt-5.5

## Attribution
- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live

## Summary

`INT-RAT1` completed the first stable rational-integration adoption over the shared polynomial/rational substrate.

The shipped slice is deliberately narrow: one-variable exact rational functions whose proper denominators decompose into distinct rational linear factors may integrate through partial fractions after derivative-backed verification.

## Output

- `src/lib/symbolic-engine/integration.ts`
- `src/types/calculator/execution-types.ts`
- `src/lib/calculus/calculus-strategy.ts`
- `src/lib/algebra/capability-readiness.ts`
- Focused tests across symbolic integration, calculus core, Advanced Calc, Calculate, math engine, golden cases, and readiness facts.

## Preserved Boundaries

- Existing `inverse-trig` and `derivative-ratio` strategies keep priority.
- `ResultOrigin` values remain unchanged.
- No source mirror, Playground runner, or external CAS is used at runtime.
- No copied external source code is adopted.
- Repeated factors, irreducible quadratics, square-free factorization, resultants, Grobner/elimination, exact linear algebra, and broad Risch/Liouville-style integration remain deferred.

## Next Candidate

If rational integration is widened next, plan `POLY-RAT-CORE1` for repeated factors and irreducible quadratic partial fractions before changing calculus again.
