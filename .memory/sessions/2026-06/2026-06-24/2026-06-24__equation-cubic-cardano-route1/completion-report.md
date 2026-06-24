# EQUATION-CUBIC-CARDANO-ROUTE1 Completion Report

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
- Scope: Equation Complex Exact selected-target Cardano route for direct symbolic cubics.

## Summary

Implemented the first live general cubic Cardano route as a Complex Exact-only capability.

## Completed

- Added an internal `cubic-cardano` selected-target route family after simpler exact polynomial/special-form/carrier routes and kept it out of generated-handoff plans.
- Added `solveParameterizedCubicCardanoEquation` under Equation parameterized ownership using the n-degree symbolic polynomial substrate.
- Supported direct degree-3 symbolic selected-target polynomials collected as `a*x^3+b*x^2+c*x+d=0`, including target-free symbolic coefficients.
- Added structured Cardano branch nodes rendered through `EquationRootSet` and finite-root presentation.
- Used `PrincipalRoot_3` only for the new Cardano route while preserving existing low-degree direct power readback.
- Honored `complexExactForm` branch multipliers: `cis` uses `\operatorname{cis}`, while rectangular/polar-compatible output uses exact trig multipliers.
- Added nonzero supplements for symbolic leading coefficients and the Cardano denominator branch when the general formula form needs it.
- Updated the higher-degree polynomial policy inspector so degree 3 reports Complex Cardano readiness while degree 4 remains Ferrari-blocked.
- Preserved the visible Ferrari-deferred quartic boundary in the app path so general symbolic quartics do not fall through to the older selected-target-island stop.

## Out Of Scope Preserved

- No Real Exact Cardano case splitting.
- No Ferrari/quartic route.
- No generated-handoff Cardano.
- No symbolic carrier-quadratic PrincipalRoot composition.
- No visible `RootOf`, implicit-root notation, inert templates, or truncated formula fallback.
- No Display, History, OOE, app-state, Tauri, or schema changes.

## Durable Memory Updated

- `.memory/current-state.md`
- `.memory/decisions.md`
- `.memory/open-questions.md`
- `.memory/journal/2026-06/2026-06-24.md`
- `.memory/research/checklists/2026-06/2026-06-24/TRACK-EQUATION-CUBIC-CARDANO-ROUTE1-MANUAL-VERIFICATION-CHECKLIST.md`
- `.memory/sessions/2026-06/2026-06-24/2026-06-24__equation-cubic-cardano-route1/`

## Next Discussion Focus

Decide whether the next Equation algorithm lane should address symbolic carrier-quadratic PrincipalRoot composition, Real-domain Cardano case splitting, or the Ferrari/quartic route.
