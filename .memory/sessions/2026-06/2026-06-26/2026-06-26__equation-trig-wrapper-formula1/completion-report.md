# EQUATION-TRIG-WRAPPER-FORMULA1 Completion Report

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
- Scope: Real Exact one-layer trig wrapper formula handoff for existing `sin`, `cos`, and `tan` composition carriers.

## Summary

Real Exact trig wrapper equations can now generate periodic branch equations and delegate generated degree-3/4 direct or safely rational-cleared equations to the existing Real Cardano/Ferrari formula payload routes.

## Completed

- Enabled formula handoff for existing Real Exact `sin(F)=rhs`, `cos(F)=rhs`, and `tan(F)=rhs` composition branches when no numeric interval route is active.
- Preserved trig branch facts: sine/cosine range constraints, integer periodic parameter facts, row-local Cardano/Ferrari guards, and generated branch provenance.
- Added exact sine/cosine endpoint dedupe before formula handoff so endpoint branches do not duplicate the same periodic family.
- Added grouped `Trig Formula Cases` caseMath promotion for trig wrapper payloads.
- Widened top-level target-denominator route planning so rational trig wrappers such as `\sin((z^3+z+1)/(z-m))=b` can still reach composition and preserve denominator exclusions.
- Added regression coverage for Real sine/cosine/tangent formula handoff, rational denominator exclusions, exact endpoint/range behavior, Complex deferral, and display case promotion.
- Extracted trig endpoint dedupe into a small composition-owned helper to keep `composition/core.ts` within the file-size ratchet.

## Out Of Scope Preserved

- No Complex trig formula wrappers.
- No nested or mixed trig wrapper formula handoff.
- No target-in-trig-argument widening beyond the existing one-layer composition carrier.
- No exp/log/algebraic behavior changes.
- No broad generated route-order widening.
- No `RootOf`, implicit-root display, persisted Display schema, History, OOE, app-state, or Tauri changes.

## Durable Memory Updated

- `.memory/current-state.md`
- `.memory/decisions.md`
- `.memory/journal/2026-06/2026-06-26.md`
- `.memory/sessions/2026-06/2026-06-26/2026-06-26__equation-trig-wrapper-formula1/`

## Commit Status

Implementation is verified locally. User approved committing the existing verified work on 2026-06-26.
