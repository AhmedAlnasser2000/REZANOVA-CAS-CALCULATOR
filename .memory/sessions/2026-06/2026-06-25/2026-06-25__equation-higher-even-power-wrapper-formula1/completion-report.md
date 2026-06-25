# EQUATION-HIGHER-EVEN-POWER-WRAPPER-FORMULA1 Completion Report

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5-codex
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5-codex
- verified_by_agent: codex
- verified_by_agent_model: gpt-5-codex
- attribution_basis: live

## Gate

- Gate label: backend
- Scope: live Real Exact one-layer higher even-power wrapper formula handoff.

## Summary

Enabled Real Exact one-layer `F(target)^n=rhs` composition for even integer exponents `4,6,8,10,12`. The wrapper generates grouped real even-root sign branches, delegates generated degree-3/4 equations through existing Cardano/Ferrari formula handoff, and preserves the current formula payload, validation, denominator-exclusion, and grouped `caseMath` readback substrate.

## Completed

- Added the `even-power` composition carrier for `Power(F(target), n)` where `n` is an even exact integer from 4 through 12.
- Kept existing `square-power` behavior and visible section titles stable for `n=2`.
- Generated Real branches `F=\sqrt[n]{rhs}` and `F=-\sqrt[n]{rhs}` for symbolic or compound target-free RHS expressions.
- Preserved a global `rhs\ge0` wrapper fact for symbolic or compound RHS expressions.
- Collapsed exact zero RHS to `F=0`.
- Stopped exact negative RHS as a real-domain empty case before generated formula delegation.
- Avoided a redundant nonnegative fact for exact positive numeric RHS.
- Allowed generated higher even-power branches to delegate to Real Cardano/Ferrari formula payloads when the generated equation clears to degree 3 or 4.
- Preserved rational denominator exclusions and local Cardano/Ferrari case facts through the generated formula payload.
- Added `Even-Power Formula Cases` grouped readback so generated branch helpers remain scoped per branch group.
- Added target-shape and route-plan evidence so top-level higher even-power wrappers and target-denominator higher even-power wrappers can attempt composition after simpler routes.
- Added a shared symbolic fallback candidate for exact numeric higher even-power cases that first pass through the shared mode fallback.

## Out Of Scope Preserved

- No nth-root wrapper route such as `\sqrt[n]{F}=rhs`.
- No Complex higher even-power wrapper formulas.
- No nested/mixed algebraic wrapper formula route.
- No exp/log/trig formula wrapper route.
- No broad generated Cardano/Ferrari route-order widening.
- No `RootOf`, implicit-root output, persisted Display schema, OOE, History, app-state, or Tauri changes.

## Durable Memory Updated

- `.memory/current-state.md`
- `.memory/decisions.md`
- `.memory/journal/2026-06/2026-06-25.md`
- `.memory/sessions/2026-06/2026-06-25/2026-06-25__equation-higher-even-power-wrapper-formula1/`

## Commit Status

Implementation is verified locally. Commit is pending the final staged checkpoint.

## Next Discussion Focus

Document the future nth-root wrapper policy before implementing `\sqrt[n]{F(target)}=rhs`, especially the even-root output constraint, root-carrier detection, and Complex principal-branch deferral.
