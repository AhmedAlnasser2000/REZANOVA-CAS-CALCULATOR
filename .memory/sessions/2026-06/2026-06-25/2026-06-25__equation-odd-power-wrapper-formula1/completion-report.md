# EQUATION-ODD-POWER-WRAPPER-FORMULA1 Completion Report

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
- Scope: live Real Exact one-layer odd-power wrapper formula handoff.

## Summary

Enabled Real Exact one-layer `F(target)^n=rhs` composition for odd integer exponents `3,5,7,9,11`. The wrapper generates one real odd-root branch, delegates generated degree-3/4 equations through existing Cardano/Ferrari formula handoff, and preserves the current formula payload, validation, denominator-exclusion, and `caseMath` readback substrate.

## Completed

- Added the `odd-power` composition carrier for `Power(F(target), n)` where `n` is an odd exact integer from 3 through 11.
- Generated exactly one Real branch `F=\sqrt[n]{rhs}` for symbolic or compound target-free RHS expressions.
- Collapsed exact zero RHS to `F=0`.
- Allowed exact negative RHS without a nonnegative-domain stop.
- Avoided emitting any `rhs\ge0` wrapper fact for odd powers.
- Allowed generated odd-power branches to delegate to Real Cardano/Ferrari formula payloads when the generated equation clears to degree 3 or 4.
- Preserved rational denominator exclusions and local Cardano/Ferrari case facts through the generated formula payload.
- Kept existing simpler finite-root paths first and kept legacy output where existing routes already solve.
- Added target-shape and route-plan evidence so large top-level odd-power wrappers and target-denominator odd-power wrappers can attempt composition after simpler routes.
- Added a shared symbolic fallback candidate for exact numeric odd-power cases that first pass through the shared mode fallback.
- Split new mode regressions into `odd-power-wrapper-formula.test.ts` to satisfy the file-size ratchet without raising caps.

## Out Of Scope Preserved

- No nth-root wrapper route such as `\sqrt[n]{F}=rhs`.
- No higher even-power wrapper route beyond the existing square-power support.
- No Complex odd-power wrapper formulas.
- No nested/mixed algebraic wrapper formula route.
- No exp/log/trig formula wrapper route.
- No broad generated Cardano/Ferrari route-order widening.
- No `RootOf`, implicit-root output, persisted Display schema, OOE, History, app-state, or Tauri changes.

## Durable Memory Updated

- `.memory/current-state.md`
- `.memory/decisions.md`
- `.memory/journal/2026-06/2026-06-25.md`
- `.memory/sessions/2026-06/2026-06-25/2026-06-25__equation-odd-power-wrapper-formula1/`

## Commit Status

Implementation is verified locally. Commit is pending the final staged checkpoint.

## Next Discussion Focus

Choose between the next Real algebraic wrapper slice: higher even powers, which need arbitrary even-root grouped branches and dedupe policy, or nth-root wrappers, which need root-carrier detection and readback policy before live solving.
