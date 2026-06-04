# POLY-RAT-CORE1 Completion Report

date: 2026-05-22  
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

`POLY-RAT-CORE1` completed a substrate-only rational-function leap before `INT-RAT2`.

The milestone strengthens shared algebra facts for exact one-variable rational functions: supported repeated rational linear factors and irreducible quadratic denominator families now have typed factorization and partial-fraction readiness envelopes.

## Output

- `src/lib/algebra/rational-function-core.ts`
- `src/lib/algebra/rational-function-core.test.ts`
- `src/lib/algebra/capability-readiness.ts`
- `src/lib/algebra/capability-readiness.test.ts`
- `.memory/research/checklists/2026-05/2026-05-22/TRACK-POLY-RAT-CORE1-MANUAL-VERIFICATION-CHECKLIST.md`
- readiness and roadmap memory updates

## Preserved Boundaries

- Stable calculus behavior remains unchanged.
- `INT-RAT1` still consumes only the distinct rational linear partial-fraction path.
- No new result origins, visible strategy chips, UI behavior, solver behavior, golden expectations, source-mirror execution, or Playground runner behavior were added.
- Broad square-free factorization, resultants, Grobner/elimination, algebraic-number coefficients, complex-root expansion, exact linear algebra, and Risch/Liouville-style work remain deferred.

## Next Candidate

If rational integration remains the priority, plan `INT-RAT2` as a bounded consumer of `POLY-RAT-CORE1` repeated/quadratic readiness with derivative-backed verification and existing interval/domain safety gates.
