# EQUATION-CUBIC-CARDANO-REAL-ROUTE1 Completion Report

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live

## Gate

- Gate label: backend
- Scope: live Real Exact Cardano for direct degree-3 selected-target polynomials.

## Summary

Made Real Exact Cardano live for direct cubic selected-target equations while preserving the existing Complex Cardano route and all schema/runtime boundaries.

## Completed

- Added `solveParameterizedRealCubicCardanoEquation(...)` beside the existing Complex Cardano solver.
- Shared direct cubic collection through the n-degree symbolic polynomial substrate.
- Routed Real Exact cubic Cardano through the existing `cubic-cardano` family after simpler exact routes.
- Added real-only compact case readback with `A/B/C/p/q/Delta` definitions.
- Kept discriminant and degeneracy facts case-local; global Valid When remains limited to symbolic `a\ne0`.
- Added exact scalar sign specialization for numeric-coefficient cubics only.
- Preserved non-`x` selected-target support in both the main answer and detail readback.
- Updated higher-degree policy inspection so degree 3 records Cardano readiness for Complex and Real Exact.
- Added focused solver, mode-level, display, and policy tests.

## CI Follow-Up

- Fixed the broad unit-suite failures found during CI/manual QA before commit.
- Added a late Real Cardano fallback after the shared exact solver for non-factorable numeric cubics such as `x^3+x+1=0` and `x^3-3*x+1=0`.
- Kept direct cube powers such as `u^3=a` and generated cube-root isolation on the algebraic-isolation/radical route before Cardano.
- Fixed finite readback normalization so `\frac{1+1}{2}` no longer collapses to zero and affine carrier roots keep the missing `x=1` branch.
- Preserved valid LaTeX command-variable spacing for `\pi n` and user-variable `i\cdot i` while still normalizing confirmed imaginary-unit products.

## Out Of Scope Preserved

- No Ferrari/quartic route.
- No generated-handoff Cardano.
- No symbolic carrier-quadratic solve.
- No visible `RootOf` or implicit-root notation.
- No Display, History, OOE, app-state, Tauri, or schema change.
- No broad sign solver or symbolic inequality prover.

## Durable Memory Updated

- `.memory/current-state.md`
- `.memory/decisions.md`
- `.memory/open-questions.md`
- `.memory/journal/2026-06/2026-06-24.md`
- `.memory/research/checklists/2026-06/2026-06-24/TRACK-EQUATION-CUBIC-CARDANO-REAL-ROUTE1-MANUAL-VERIFICATION-CHECKLIST.md`
- `.memory/sessions/2026-06/2026-06-24/2026-06-24__equation-cubic-cardano-real-route1/`

## Commit Status

User approved committing the milestone with the CI repairs in the same commit. Commit is pending final memory protocol and diff checks.

## Next Discussion Focus

After manual app QA, the next algorithm discussion should choose between Ferrari/quartic prerequisites, symbolic carrier-quadratic Complex composition, or a Display layout/sizing polish milestone for large case-style answers.
