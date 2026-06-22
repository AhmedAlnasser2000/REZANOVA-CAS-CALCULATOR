# EQUATION-CARRIER-ELIMINATION-FRONTIER1 Completion Report

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

Implemented a bounded real Exact carrier-elimination route for explicit algebraic carriers.

The new internal `carrier-elimination` selected-target family detects exact-rational linear/quadratic equations in a known carrier `u=g(x)`, solves the reduced equation, then back-substitutes each real carrier root through existing generated branch solvers. This keeps facts, supplements, branch readback, candidate validation, and route trace evidence on already-proven seams.

## Code Changes

- Added `src/lib/equation/parameterized/carrier-elimination.ts`.
- Added focused tests in `src/lib/equation/parameterized/carrier-elimination.test.ts`.
- Added `carrier-elimination` to the route-family planner and tests.
- Routed `runParameterizedUnsupportedRoute(...)` through the new family after `special-form-roots` and before older carrier/algebraic fallbacks.
- Added search-trace and parameterized-family coverage for top-level and generated-handoff evidence.

## Supported V1 Shapes

- `(x^2+a)^2-5(x^2+a)+4=0`
- `(x+a)^4-5(x+a)^2+4=0`
- `(\sqrt{x+a})^2-5\sqrt{x+a}+4=0`

The helper also normalizes common carrier powers such as `(x+a)^4` into a quadratic in `(x+a)^2` when the total selected-target degree remains within the frontier boundary.

## Boundaries

- Real Exact route only.
- Reduced carrier coefficients must be exact-rational in v1.
- Carriers must be algebraic and solvable by existing selected-target branch solvers.
- Periodic/transcendental carriers, arbitrary auxiliary-variable inference, symbolic reduced-carrier coefficients, general Groebner/resultant solving, Complex widening, visible implicit roots, numeric Exact fallback, Display/History schemas, OOE/app-state/Tauri changes, graphing, step-by-step, and DAG/search graph are out of scope.

## Manual QA

- `(x^2+a)^2-5(x^2+a)+4=0` should solve with branches from `x^2+a=4` and `x^2+a=1`.
- `(x+a)^4-5(x+a)^2+4=0` should solve with branches from `(x+a)^2=4` and `(x+a)^2=1`.
- `(\sqrt{x+a})^2-5\sqrt{x+a}+4=0` should solve with branches from `\sqrt{x+a}=4` and `\sqrt{x+a}=1`.
- `(x^7+a)^2-5(x^7+a)+4=0` should stop at the degree boundary.
- `\sin(x)^2-5\sin(x)+4=0` should stop honestly because periodic/transcendental carrier elimination is deferred.

## Durable Memory Updated

- `.memory/current-state.md`
- `.memory/journal/2026-06/2026-06-22.md`
- `.memory/decisions.md`
- `.memory/research/roadmaps/equation-frontier-solver-roadmap.md`
- `.memory/sessions/2026-06/2026-06-22/2026-06-22__equation-carrier-elimination-frontier1/`
