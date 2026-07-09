# EQUATION-NTH-ROOT-WRAPPER-FORMULA1 Completion Report

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
- Scope: live Real Exact one-layer nth-root wrapper formula handoff.

## Summary

Enabled Real Exact one-layer `\sqrt[n]{F(target)}=rhs` composition for exact integer root indices `3..12`. The wrapper generates one Real branch `F=rhs^n`, delegates generated degree-3/4 equations through existing Real Cardano/Ferrari formula handoff, and preserves formula payload validation, denominator exclusions, wrapper facts, local case facts, and `caseMath` readback.

## Completed

- Added `nth-root` composition carrier detection for `Root(F(target), n)` where `n` is an exact integer from 3 through 12.
- Kept existing square-root `n=2` behavior on the prior square-root path.
- Generated one branch `F=rhs^n` for odd-index roots, including exact negative RHS values.
- Generated one branch `F=rhs^n` for even-index roots while preserving a symbolic or compound `rhs\ge0` wrapper fact.
- Collapsed exact zero RHS to `F=0`.
- Stopped exact negative RHS for even-index roots as a real-domain empty case before generated formula delegation.
- Allowed target-free symbolic or compound RHS expressions.
- Preserved rational denominator exclusions when the generated branch clears denominators before Cardano/Ferrari.
- Added `Nth-Root Formula Cases` grouped readback and Display promotion for formula-backed Real case rows.
- Added mode-level coverage for non-`x` selected targets.

## Out Of Scope Preserved

- No Complex nth-root wrapper formulas.
- No nested/mixed algebraic wrapper formula route.
- No exp/log/trig formula wrapper route.
- No broad generated Cardano/Ferrari route-order widening.
- No `RootOf`, implicit-root output, numeric-only Exact fallback, persisted Display schema, OOE, History, app-state, or Tauri changes.

## Durable Memory Updated

- `.memory/current-state.md`
- `.memory/decisions.md`
- `.memory/journal/2026-06/2026-06-25.md`
- `.memory/sessions/2026-06/2026-06-25/2026-06-25__equation-nth-root-wrapper-formula1/`

## Commit Status

Implementation is verified locally. Commit is pending the final staged checkpoint and explicit commit approval.

## Next Discussion Focus

Run the formula readback simplification gate so Cardano/Ferrari-derived wrapper answers remove obvious arithmetic noise without widening solver scope or replacing the longer-term presentation pipeline work.
