# EQUATION-COMPLEX-INTERMEDIATE-POLICY1 Completion Report

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
- Scope: Equation Complex symbolic principal-root policy and direct special-form power support.

## Summary

Implemented the formal internal Complex principal-root policy needed before future symbolic complex-intermediate formula work.

## Completed

- Added an Equation-owned PrincipalRoot branch node under `src/lib/equation/roots/`.
- Extended finite-root presentation so node-backed PrincipalRoot branches render through the existing branch/exact readback path.
- Split Complex special-form collection so direct symbolic radicands with exact-rational carrier coefficients can solve, while symbolic target-power coefficients and symbolic carrier quadratics still stop honestly.
- Enabled Complex Exact direct symbolic powers through degree 12 for pure and affine carriers such as `x^5=a`, `(x+c)^5=a`, and `(2*x-1)^6=a`.
- Preserved existing low-degree symbolic Complex power output such as `u^3=a`.

## Out Of Scope Preserved

- No Cardano/Ferrari formulas.
- No symbolic carrier-quadratic solving.
- No visible `RootOf` or implicit-root notation.
- No Display, History, OOE, app-state, Tauri, or schema changes.
- No changes to Exact-rational Complex special-form behavior.

## Durable Memory Updated

- `.memory/current-state.md`
- `.memory/decisions.md`
- `.memory/journal/2026-06/2026-06-24.md`
- `.memory/open-questions.md`
- `.memory/research/audits/equation-complex-intermediate-policy1-2026-06-24.md`
- `.memory/sessions/2026-06/2026-06-24/2026-06-24__equation-complex-intermediate-policy1/`

## Next Discussion Focus

The next algorithm choice is whether to proceed to a Cardano route over the now-explicit PrincipalRoot policy, or first add a separate symbolic carrier-quadratic PrincipalRoot composition slice.
