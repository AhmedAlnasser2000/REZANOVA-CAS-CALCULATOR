# EQUATION-ABS-WRAPPER-FORMULA1 Completion Report

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
- Scope: first live Real Exact absolute-value wrapper formula route plus grouped generated-formula readback substrate.

## Summary

Enabled Real Exact one-layer `|F(target)|=b` composition to opt into generated Cardano/Ferrari formula handoff. The wrapper splits into generated sign branches `F=b` and `F=-b`, preserves `b\ge0`, denominator exclusions, branch provenance, and case-local formula conditions, and renders one grouped `caseMath` answer.

## Completed

- Let absolute-value composition consume the Real generated formula option already used by square-root wrappers.
- Added grouped Real formula promotion for multiple generated formula payloads so each sign branch keeps local Cardano/Ferrari cases and detail definitions.
- Added internal Display `caseMath` grouping support with optional group headers; this does not change persisted DisplayOutcome, History, OOE, app-state, Tauri, or copy contracts.
- Collapsed exact `|F|=0` to one generated branch `F=0`.
- Kept exact negative RHS domain-empty.
- Added target-shape `targetUnderAbs` evidence and route planning so `abs(rational)` can attempt composition while ordinary target-denominator equations keep rational/formula order.
- Added a Real Exact shared-fallback bridge so exact numeric zero RHS abs wrappers such as `|z^3+z+1|=0` and `|z^4+z+1|=0` reach the one-branch formula handoff instead of the older stronger-carrier stop.
- Fixed the isolated-worker/runtime path by preserving the pre-retargeted shared resolved equation across async guarded-solve capture; this keeps non-`x` fallbacks such as `z^3+z+1=0` and `|z^3+z+1|=0` from trying to solve an `x`-retargeted equation against target `z`.
- Added tests for direct cubic/quartic abs wrappers, rational abs wrappers, non-`x` targets, exact zero/negative RHS, Complex unsupported behavior, grouped Display blocks, and existing square-root/direct Cardano/Ferrari stability.

## Out Of Scope Preserved

- No Complex Exact absolute-value wrapper formula route.
- No square-power formula handoff.
- No nested/mixed algebraic wrapper formula handoff.
- No carrier-elimination formula handoff.
- No exp/log/trig formula wrapper route.
- No broad generated formula route widening.
- No `RootOf`, implicit-root output, schema, OOE, History, app-state, or Tauri changes.
- No Cardano/Ferrari solver rewrite.

## Durable Memory Updated

- `.memory/current-state.md`
- `.memory/decisions.md`
- `.memory/journal/2026-06/2026-06-25.md`
- `.memory/sessions/2026-06/2026-06-25/2026-06-25__equation-abs-wrapper-formula1/`

## Commit Status

Implementation is verified locally. User approval to fix the numeric zero case and commit was given in chat.

## Next Discussion Focus

Choose the next wrapper formula family. Recommended next candidates are square-power policy/readback or a broader algebraic wrapper policy for mixed legacy/formula grouping; Complex absolute-value wrappers should remain deferred until a magnitude/preimage policy exists.
