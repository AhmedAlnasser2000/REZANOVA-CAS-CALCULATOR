# EQUATION-COMPLEX-SPECIAL-FORM-FRONTIER1 Completion Report

Date: 2026-06-21

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live implementation

## Audit Gate

- Branch count is the v1 safety boundary for Complex special-form roots.
- Exact-rational direct and carrier-quadratic pure/affine shapes can reuse existing finite branch readback without Display or History schema changes.
- High-degree rectangular radical branches are not a stable compact readback target, so v1 uses exact `cis` notation for high-degree Complex branches.
- Symbolic-coefficient Complex carrier roots and non-real carrier-quadratic roots remain deferred because their branch/fact semantics need a later policy.

## Completed

- Added `src/lib/equation/complex/special-form-carrier.ts` for exact-rational pure/affine carrier collection and back-substitution.
- Added `src/lib/equation/complex/special-form-roots.ts` for bounded Complex direct/carrier special-form solving through 12 visible branches.
- Routed Complex On symbolic solving through the new helper before real/frontier factorable paths can return partial real-only roots.
- Preserved existing low-degree Complex rectangular readback by letting degree-2/3/4 cases fall through to the existing bounded Complex solver.
- Updated Complex-domain tests for exact-rational high-degree success, symbolic-coefficient deferral, and branch-cap boundaries.

## Manual QA Cases

- `x^5=32` with Complex On should show five exact `cis` branches.
- `x^6-5x^3+4=0` with Complex On should show six exact branches.
- `(2*x-1)^{12}-5*(2*x-1)^6+4=0` with Complex On should show twelve exact branches.
- `x^6-a*x^3+b=0` with Complex On should stop with symbolic-coefficient Complex deferral.
- `(x+a)^{13}=32` with Complex On should stop at the 12-branch cap.

## Out Of Scope

- No symbolic-coefficient Complex carrier roots.
- No non-real carrier-quadratic special-form roots.
- No broad Complex high-degree factoring, Cardano/Ferrari, visible implicit roots, numeric Exact fallback, Display/History schema, OOE/app-state/Tauri, graphing, step-by-step, or DAG/search graph work.
