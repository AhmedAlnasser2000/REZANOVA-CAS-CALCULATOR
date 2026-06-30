# EQUATION-IMPLICIT-DERIVATIVE-SOLVE-SEAM1 Completion Report

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5-codex
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5-codex
- verified_by_agent: codex
- verified_by_agent_model: gpt-5-codex
- attribution_basis: live

## Summary

Completed `EQUATION-IMPLICIT-DERIVATIVE-SOLVE-SEAM1` as the Equation-owned prerequisite for the later guided Calculus implicit differentiation screen.

## Changes

- Added `src/lib/equation/implicit-derivative-solve.ts` as a public Equation seam.
- The seam accepts a differentiated relation, one internal derivative placeholder, and a display derivative such as `\frac{dy}{dx}`.
- It delegates to existing selected-target isolation, accepts only clean placeholder equalities, maps the result to display derivative output, and returns controlled unsupported stops for missing, invalid, unsupported, or multi-branch derivative outputs.
- Added focused unit tests for circle-style implicit output, `xy+\sin(y)=x` output, missing placeholders, nonlinear derivative branches, and seam input validation.
- Registered the seam in the compartment manifest so future Calculus imports stay on the approved public boundary.

## Boundaries

- No guided Calculus implicit screen, derivative UI, Display schema, OOE, History, Tauri, or runtime changes.
- No Equation numeric interval work was touched; active dirty numeric interval and special-function files belong to other agents.
