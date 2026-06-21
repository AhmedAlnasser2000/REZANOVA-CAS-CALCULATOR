# EQUATION-FACTORABLE-DECOMPOSITION-FRONTIER1 Completion Report

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors:
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live

## Summary

Implemented the first Equation frontier code milestone by widening explicit zero-product factorable solving from the old shared degree-4 boundary to a dedicated 12 target-degree-slot path.

The widened path applies only when the equation is an explicit zero product and each target-containing factor can delegate through existing linear or quadratic selected-target solvers. Expanded/exact-rational factorable solving keeps the existing degree-4 behavior.

## Gate Type

- backend

## Files Updated

- `src/lib/equation/parameterized/factorable-polynomial.ts`
- `src/lib/equation/parameterized/factorable-polynomial.test.ts`
- `src/lib/equation/cap-hit-evidence.test.ts`
- `.memory/current-state.md`
- `.memory/decisions.md`
- `.memory/journal/2026-06/2026-06-21.md`
- `.memory/research/roadmaps/equation-frontier-solver-roadmap.md`
- `.memory/sessions/2026-06/2026-06-21/2026-06-21__equation-factorable-decomposition-frontier1/`

## Completion Notes

- Five explicit linear factors now solve instead of hitting the old degree boundary.
- Twelve explicit target-degree slots solve when all target factors are supported linear/quadratic factors.
- Thirteen explicit target-degree slots still stop with `degree-limit`.
- Repeated explicit factors such as `(z-a)^{12}=0` preserve multiplicity detail while visible roots remain deduped.
- Mixed linear/quadratic explicit products preserve delegated quadratic domain facts.
- Target-free symbolic factors, unsupported target-in-function factors, and expanded symbolic cubic/quartic behavior remain unchanged.
- No broad automatic factoring, general cubic/quartic formulas, implicit visible roots, numeric fallback, DAG/search graph, OOE, Display, History, app-state, Tauri, graphing, step-by-step, or Exact/Isolate behavior changed.
