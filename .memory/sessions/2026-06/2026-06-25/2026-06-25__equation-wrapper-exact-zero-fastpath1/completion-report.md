# EQUATION-WRAPPER-EXACT-ZERO-FASTPATH1 Completion Report

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
- Scope: bugfix for exact-zero algebraic wrapper formula performance plus durable UI/readback bug note.

## Summary

Fixed the user-reported slow app-mode path for Real Exact exact-zero algebraic wrapper formulas such as `(z^3+z+1)^{10}=0`. The mode layer now short-circuits exact-zero formula wrappers through the existing validated composition formula fallback before the broad shared high-degree exact solve attempts the expanded power.

## Completed

- Added a pre-shared algebraic formula fallback for Real Exact, no numeric interval, selected-target formula wrapper equations with exact zero RHS.
- Kept the pre-shared path narrow: it only accepts existing formula wrapper carriers and exact zero target-free RHS.
- Reused the existing composition formula handoff, wrapper validation, Cardano/Ferrari payload, and `caseMath` readback instead of adding a new solver route.
- Added mode-level regression coverage for `\left(z^3+z+1\right)^{10}=0`.
- Recorded the separate Cardano/Ferrari readback/UI bug from user QA and Claude's note without changing that code in this pass.

## Cardano/Ferrari UI Bug Recorded

- All-concrete exact-rational coefficient Cardano/Ferrari cases should show computed root values when possible, not the symbolic derivation form as the primary answer.
- Symbolic-coefficient Cardano/Ferrari cases may continue using compact derivation readback with helper definitions.
- A future `Extraneous solutions` card should list candidates rejected by candidate validation, including substituted value, failed condition, and short rejection reason.

## Durable Memory Updated

- `.memory/current-state.md`
- `.memory/decisions.md`
- `.memory/journal/2026-06/2026-06-25.md`
- `.memory/sessions/2026-06/2026-06-25/2026-06-25__equation-wrapper-exact-zero-fastpath1/`

## Commit Status

Implementation and verification are complete. Commit is pending explicit user approval.
