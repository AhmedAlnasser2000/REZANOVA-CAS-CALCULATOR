# EQUATION-SEARCH-DISCIPLINE-AUDIT0

Date: 2026-06-19

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors: claude
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: mixed

## Scope

- Audit only. No `src/` edits.
- Preserve and correct the external solver-phase handoff before implementation planning.
- Focus on Equation selected-target and parameterized search discipline, not graphing, step-by-step, Rust migration, OOE authority, or new solver algorithms.

## Current Route Map

- `src/lib/engine/semantic-planner.ts` is a facade for `planMathExecution`. It is not the selected-target strategy router.
- Equation symbolic execution enters through `src/lib/modes/equation/symbolic.ts`.
- Unsupported parameterized/selected-target cases route through `runParameterizedUnsupportedRoute` in `src/lib/modes/equation/parameterized.ts`.
- `runParameterizedUnsupportedRoute` tries these broad families before selected-target isolation: linear, polynomial, rational, factorable, carrier, algebraic isolation, exp/log, trig, composition, mixed algebraic, then selected-target isolation.
- `solveSelectedTargetIsolationEquation` in `src/lib/equation/isolation/selected-target.ts` peels structures and delegates repeatedly through family solvers.
- Exp/log generated-equation handoff lives in `src/lib/equation/parameterized/exp-log-core.ts`, where generated equations can flow into linear, polynomial, rational, or carrier handoffs.
- Existing exact coefficient-map polynomial infrastructure lives under `src/lib/algebra/polynomial-core/`; parameterized symbolic polynomial collectors still use local `MathJson` coefficient shapes.

## Findings

1. The handoff is correct that search order matters, but wrong to point primarily at `semantic-planner.ts`.
2. The live high-risk search zone is selected-target isolation plus generated-equation handoff, especially exp/log -> symbolic polynomial, not the first cheap failed parameterized families.
3. The repo already supports flat exact polynomial maps. The missing/fragile part is not "create any flat polynomial representation"; it is deciding whether and how parameterized symbolic coefficient collectors should reuse or parallel that core.
4. Wall-clock performance protection belongs in a focused solver perf sentinel or dev harness. The golden corpus should stay a small correctness contract for shipped behavior.
5. Future recursion should be bounded, shape-routed, cancellable, and traceable. "Infinitely powerful recursion" is the wrong Calcwiz product contract; the right target is controlled search with honest stops and expandable capability.

## Live Evidence To Preserve

- Reference target family:

```text
sqrt(cv) * (11 / d^(3+s^2)) = 4x + y^(j-8o) + t^(3+p^2)
```

- Local probing found the `s` solve path much slower than `t`, while `d` stopped cleanly. The important result is not the exact machine-dependent timing; it is the route imbalance and selected-target/generator handoff shape.
- Early family rejection for the `s` case was cheap in local probing. The expensive path was selected-target isolation/delegation and generated symbolic-polynomial work.
- A generated power equation such as `d^(3+s^2)=...` exposed the same handoff risk: exp/log can generate a polynomial-looking equation that becomes expensive when symbolic coefficients are simplified/verified.

## Open Design Items

- What exact shape-profile type should Equation own first, and should it live under `src/lib/equation/target-shape/`, `src/lib/equation/isolation/`, or a narrower parameterized helper?
- What should the first performance sentinel measure: direct `runEquationMode`, selected-target helper calls, or a lower-level route profiler that avoids UI/runtime noise?
- What thresholds are useful without making CI flaky across machines?
- How much of the `MathJson` coefficient parameterized polynomial collector can safely align with `polynomial-core` without losing symbolic-parameter formatting/readback?

## Recommended Next Milestone

Start with `EQUATION-TARGET-SHAPE-PROFILE1` if the next step is implementation, or extend this audit with a temporary dev-only route profiler if more evidence is needed before implementation.

Implementation guardrails:

- Keep OOE, History, Display, app-state, and worker hosts unchanged.
- Do not add a broad planner, bus, registry, Supercarrier expansion, plugin layer, or Rust solver.
- Preserve current successes and structured stops.
- Add focused tests around route choice and no-regression outcomes before adding any new solver capability.
