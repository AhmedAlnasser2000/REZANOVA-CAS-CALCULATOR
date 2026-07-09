# EQUATION-QUARTIC-FERRARI-ROUTE1 Completion Report

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
- Scope: live top-level Ferrari for direct degree-4 selected-target polynomials in Complex Exact and Real Exact.

## Summary

Implemented the first live Ferrari route on top of the confirmed Cardano substrate without widening generated/wrapper handoff, rational-cleared quartics, schemas, OOE, History, app-state, or Tauri.

## Completed

- Added the top-level `quartic-ferrari` selected-target route family after `cubic-cardano`.
- Added a parameterized Ferrari solver using the n-degree symbolic polynomial substrate.
- Normalized direct quartics to `A/B/C/D` and compact Ferrari auxiliaries `p/q/r/P/Q/Delta/R/U/Y/S/F_sigma`.
- Added structured Ferrari branch nodes and finite-root presentation support for Complex Exact four-branch output.
- Added Real Exact Ferrari readback as `caseMath`-compatible rows with resolvent Cardano cases and case-local radicand conditions.
- Added a `q=0` biquadratic special form that avoids the `U` and `S` denominator facts.
- Updated higher-degree policy so degree 4 reports Ferrari readiness for Real and Complex Exact.
- Added route/display/generated-handoff regressions proving top-level Ferrari is live while generated Ferrari stays non-live.
- Extracted Cardano/Ferrari formula route wiring into `parameterized-formula-routes.ts` to keep `parameterized.ts` under the file-size ratchet.

## Out Of Scope Preserved

- No rational-cleared quartic Ferrari normalization.
- No generated/wrapper Ferrari or generated/wrapper Cardano widening.
- No symbolic carrier-quadratic solve.
- No visible `RootOf` or implicit-root notation.
- No Display, History, OOE, app-state, Tauri, or persisted schema change.
- No broad CAS recursion or Ferrari under radicals/logs/trig/abs.

## Durable Memory Updated

- `.memory/current-state.md`
- `.memory/decisions.md`
- `.memory/journal/2026-06/2026-06-25.md`
- `.memory/research/checklists/2026-06/2026-06-25/TRACK-EQUATION-QUARTIC-FERRARI-ROUTE1-MANUAL-VERIFICATION-CHECKLIST.md`
- `.memory/sessions/2026-06/2026-06-25/2026-06-25__equation-quartic-ferrari-route1/`

## Commit Status

User approved committing after manual app screenshots looked correct. Commit is pending final metadata staging.

## Next Discussion Focus

After manual app QA, the natural next backend gate is the combined degree-3/4 rational normalization milestone so top-level denominator clearing can feed both Cardano and Ferrari consistently, followed by the generated-handoff audit/widening work.
