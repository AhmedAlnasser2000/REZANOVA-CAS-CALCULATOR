# EQUATION-CARDANO-FERRARI-COEFFICIENT-READBACK1 Completion Report

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
- Scope: Cardano/Ferrari coefficient-specialized primary readback.

## Summary

Fixed the Cardano/Ferrari primary answer readback so generic coefficient templates may still show compact helper-symbol formulas, while specialized symbolic, mixed, missing-slot, zero-slot, compound, and concrete exact-rational coefficient equations show collected coefficients substituted into the primary branch/case rows.

## Completed

- Added a shared coefficient readback classifier under Equation parameterized ownership.
- Preserved the generic full-slot template behavior for direct symbolic templates such as `a*x^3+b*x^2+c*x+d=0` and `a*x^4+b*x^3+c*x^2+d*x+e=0`.
- Updated Real and Complex Cardano to use substituted primary readback for specialized coefficient inputs such as `x^3+p*x+2=0` and exact numeric non-factorable cubics.
- Updated Real and Complex Ferrari to use substituted primary readback for specialized quartics such as `x^4+p*x^2+r=0` and `x^4+p*x+2=0`.
- Kept derivation details available in collapsed/local detail sections for specialized cases.
- Preserved wrapper formula payload compatibility so generated square-root, absolute-value, square-power, odd-power, and higher even-power formula consumers inherit the corrected Cardano/Ferrari primary readback.
- Preserved existing simpler route priority, factorable/special-form outputs, `PrincipalRoot` policy, Real `caseMath`, Display/History/OOE/app-state/Tauri schemas, and wrapper boundaries.

## Durable Memory Updated

- `.memory/current-state.md`
- `.memory/decisions.md`
- `.memory/journal/2026-06/2026-06-25.md`
- `.memory/sessions/2026-06/2026-06-25/2026-06-25__equation-cardano-ferrari-coefficient-readback1/`

## Commit Status

Implementation and verification are complete. Commit is pending the final staged checkpoint.

## Next Discussion Focus

Add the separate `Extraneous Solutions` detail card so rejected candidate evidence is visible instead of only represented as counts or silent back-substitution drops.
