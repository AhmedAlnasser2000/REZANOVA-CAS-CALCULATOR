# EQUATION-COMPLEX-MIXED-ALGEBRAIC-WRAPPER-CATCHUP1 Completion Report

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live

## Status

Implemented and verified locally as a backend Equation wrapper milestone. Commit follows the user-approved commit-after-each-verified-milestone cadence.

## Summary

- Added a Complex mixed algebraic wrapper route for exactly one selected-target principal root carrier plus a bounded selected-target algebraic companion.
- Isolated the principal-root value, preserved principal-image facts for target-dependent values such as `b-z`, powered the carrier equation, and solved only compact generated linear/quadratic or existing compact Complex-capable branch equations.
- Kept the route ownership narrow with a selected-target root-wrapper precheck, so exp/log/trig preimage wrappers and Complex abs policy are not intercepted.
- Added focused coverage for `\sqrt{z+a}+z=b`, `\sqrt{z^2+1}+z=b`, generated cubic/quartic deferral, two-root carriers, nested roots, abs companions, and noncompact powered branches.

## Boundaries

- No Display, Formula Viewer, Copy Result, History, OOE, app-state, Tauri, persisted schema, or public runtime contract changes.
- No generated Complex Cardano/Ferrari wrapper formula readback.
- No visible `RootOf`.
- No two-selected-target root carriers, nested mixed radicals, abs companions, over-cap branches, or non-Exact/numeric-interval widening.

## Files Updated

- `src/lib/modes/equation/complex-mixed-algebraic-wrapper-route.ts`
- `src/lib/modes/equation/complex-wrapper-routes.ts`
- `src/lib/modes/equation/complex-mixed-algebraic-wrapper-catchup.test.ts`
- `.memory/current-state.md`
- `.memory/decisions.md`
- `.memory/journal/2026-06/2026-06-28.md`
- `.memory/research/roadmaps/equation-complex-wrapper-catchup-roadmap.md`
- `.memory/sessions/2026-06/2026-06-28/2026-06-28__equation-complex-mixed-algebraic-wrapper-catchup1/`
