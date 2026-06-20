# EQUATION-SEARCH-DISCIPLINE-CLOSEOUT0

Date: 2026-06-20

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors:
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live

## Scope

- Closeout audit only.
- No `src/` edits.
- Decide whether the Equation search-discipline foundation is complete enough to move into cap recalibration.

## Verdict

`EQUATION-SEARCH-DISCIPLINE-CLOSEOUT0` is good. The foundation track is complete enough to stop adding search infrastructure for its own sake and move to the separate cap recalibration audit.

The repo now has bounded, inspectable selected-target search discipline:

- cheap target-shape profiling before expensive solver families;
- conservative route planning for top-level and generated handoff phases;
- internal/test-facing trace evidence for profiles, skips, attempts, successes, and final stops;
- route-gated exp/log generated-equation handoff;
- shared symbolic polynomial coefficient collection for parameterized polynomial and rational solvers;
- shared generated-branch handoff for carrier, composition, and mixed-algebraic branches;
- shared MathJson arithmetic adoption in carrier and mixed-algebraic where parity was proven.

## Evidence Map

- Shape profile and route plan: `src/lib/equation/target-shape/`
- Public Equation facade: `src/lib/equation/equation-target-shape.ts`
- Top-level selected-target consumption: `src/lib/modes/equation/parameterized.ts`
- Generated selected-target delegation: `src/lib/equation/isolation/selected-target.ts`
- Exp/log generated handoff: `src/lib/equation/parameterized/exp-log-generated-handoff.ts`
- Shared branch handoff: `src/lib/equation/parameterized/generated-branch-handoff.ts`
- Symbolic coefficient seam: `src/lib/equation/parameterized/symbolic-polynomial.ts`
- Shared arithmetic seam: `src/lib/equation/parameterized/math-json.ts`
- Carrier/mixed arithmetic adoption: `src/lib/equation/parameterized/carrier.ts`, `src/lib/equation/parameterized/mixed-algebraic.ts`

## What Is Complete

- Search routing is no longer a blind broad cascade for selected-target cases where shape evidence can safely prune impossible families.
- Generated equations from exp/log, selected-target isolation, carrier, composition, and mixed-algebraic branches can be profiled and route-gated.
- Tests can prove route discipline through trace evidence without depending on fragile wall-clock assertions.
- Polynomial/rational symbolic coefficient handling has one Equation-owned seam instead of repeated local mechanics.
- Carrier/composition/mixed branch helpers share delegation mechanics while preserving branch-specific solver judgment.

## What Is Not Complete

These are intentionally outside the closeout:

- cap recalibration;
- Cardano/Ferrari or higher-degree algorithms;
- broad factoring, numeric fallback, Lambert W, integration breadth, ODE/PDE work;
- Exact/Isolate answer-mode boundary cleanup;
- Display result-card redesign, graphing, step-by-step, Rust solver migration, OOE changes, History changes, app-state changes, or Tauri changes.

## Closeout Decision

The search discipline roadmap should now be treated as a foundation that future solver work consumes. New work should not add another planner, trace layer, generated-handoff path, or coefficient representation unless a concrete unsupported case proves the existing seams are insufficient.

The next valid follow-up is `EQUATION-CAP-RECALIBRATION-AUDIT0`, because routing and representation are stable enough to inspect which caps are still correctness/readback limits and which might become safe recalibration candidates.
