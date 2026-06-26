# EXP-LOG-RATIONAL-ROUTE-FIX1 Completion Report

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
- Scope: follow-up bugfix for Real Exact exp/log formula handoff with selected-target denominator carriers, plus a UI test synchronization fix.

## Summary

Fixed the route-plan intersection where denominator-shaped selected-target equations could try rational/Cardano/Ferrari families but skipped the outer exp/log family. Real Exact rational log carriers now reach the existing exp/log generated-equation path and preserve denominator exclusions through generated Cardano/Ferrari formula handoff.

## Completed

- Kept `exp-log` route eligibility when a selected target appears both inside an exp/log argument/exponent and in a denominator.
- Added route-plan, mode-level, and search-trace regressions for `\ln((z^3+z+1)/(z-m))=b`.
- Verified the generated handoff records top-level `exp-log` success and generated `cubic-cardano` success for the rational log carrier.
- Stabilized the AppMain UI variable-hint regression by waiting for the fresh `hello` hint after the editor changes away from a stored variable expression.

## Out Of Scope Preserved

- No Complex exp/log formula wrappers.
- No target-in-base formula widening.
- No trig formula handoff.
- No nested/mixed wrapper formula widening.
- No broad generated route-order widening.
- No Display, History, OOE, app-state, Tauri, or persisted schema change.

## Durable Memory Updated

- `.memory/current-state.md`
- `.memory/journal/2026-06/2026-06-26.md`
- `.memory/sessions/2026-06/2026-06-26/2026-06-26__exp-log-rational-route-fix1/`

## Commit Status

Implementation is verified locally. Commit is pending explicit user approval.
