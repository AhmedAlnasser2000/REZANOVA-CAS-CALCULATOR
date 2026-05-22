# CALC-RAT-READBACK0 Completion Report

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

`CALC-RAT-READBACK0` polishes the visible readback surface for rational partial-fraction integral results already supported by `INT-RAT2`.

The pass improves app-owned LaTeX construction, carries partial-fraction detail notes through Calculate, Basic Calculus, and Advanced Calc surfaces, and adds Guide examples that launch the supported repeated-linear and quadratic rational integral cases.

## Output

- `src/lib/symbolic-engine/integration.ts`
- `src/lib/calculus/calculus-core.ts`
- `src/lib/calculus/calculus-eval.ts`
- `src/lib/guide/content/selectors.ts`
- focused tests for symbolic integration, calculus core, Advanced Calc, Calculate mode, and Guide routing
- durable memory and manual verification checklist updates

## Decision

This is readback/display polish only. It does not add a new rational-integration family, result origin, strategy label, simplification rule, solver behavior, source-mirror use, or Playground runner behavior.

## Deferred

- broader simplification behavior
- broader rational integration beyond current `INT-RAT2` families
- assumptions/domain-policy expansion
- source-mirror execution
- new stable result contracts
