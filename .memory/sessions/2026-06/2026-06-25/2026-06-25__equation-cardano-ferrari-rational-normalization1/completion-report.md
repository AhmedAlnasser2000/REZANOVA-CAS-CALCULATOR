# EQUATION-CARDANO-FERRARI-RATIONAL-NORMALIZATION1 Completion Report

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
- Scope: top-level rational denominator clearing for Cardano and Ferrari formula routes.

## Summary

Generalized the Cardano-only rational clearing seam into a formula rational-normalization module and made safe top-level denominator clearing feed Cardano for cleared cubics and Ferrari for cleared quartics. Generated and wrapper formula handoff remains non-live.

## Completed

- Added `src/lib/equation/parameterized/formula-rational-normalization.ts` as the neutral owner for bounded rational clearing before formula routes.
- Kept `cubic-cardano-rational.ts` as a compatibility re-export for the old Cardano-named import path.
- Preserved rational-cleared cubic Cardano behavior and readback.
- Added rational-cleared quartic Ferrari delegation for Real Exact and Complex Exact.
- Preserved denominator exclusion facts and merged them with Cardano/Ferrari validity facts.
- Updated target-denominator route planning to attempt `rational`, `cubic-cardano`, then `quartic-ferrari`.
- Updated top-level formula route wiring so direct Ferrari still runs first and rational Ferrari only activates after a target-denominator stop.
- Added solver, route-plan, trace, display/mode, and generated-handoff regressions.
- Stabilized the CI-failing Equation numeric interval angle-unit UI test without changing production behavior.

## Out Of Scope Preserved

- No generated or wrapper Cardano/Ferrari solving.
- No Ferrari under radicals, logarithms, trigonometry, absolutes, or other generated handoff families.
- No visible `RootOf` or implicit-root output.
- No Display, History, OOE, app-state, Tauri, or persisted schema change.
- No broad CAS recursion or formula route under symbolic carrier quadratics.

## Durable Memory Updated

- `.memory/current-state.md`
- `.memory/decisions.md`
- `.memory/journal/2026-06/2026-06-25.md`
- `.memory/research/checklists/2026-06/2026-06-25/TRACK-EQUATION-CARDANO-FERRARI-RATIONAL-NORMALIZATION1-MANUAL-VERIFICATION-CHECKLIST.md`
- `.memory/sessions/2026-06/2026-06-25/2026-06-25__equation-cardano-ferrari-rational-normalization1/`

## Commit Status

Committed after user approval. The final hash is reported in the assistant response rather than stored inside the self-referential commit metadata.

## Next Discussion Focus

The next natural gate is the combined generated-handoff audit/widening plan for Cardano and Ferrari, with special care around wrapper back-substitution facts, case-local real rows, four-root output, and candidate validation.
