# EQUATION-SQUARE-POWER-WRAPPER-FORMULA1 Completion Report

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
- Scope: live Real Exact one-layer square-power wrapper formula handoff plus grouped readback reuse.

## Summary

Enabled Real Exact one-layer `F(target)^2=rhs` composition to opt into generated Cardano/Ferrari formula handoff. The wrapper splits into `F=\sqrt{rhs}` and `F=-\sqrt{rhs}` when the target-free RHS is symbolic/nonnegative-gated, collapses exact zero RHS to one branch, and stops exact negative RHS as domain-empty.

## Completed

- Added square-power branch generation for target-free RHS expressions, not only bare symbols.
- Reused and generalized grouped generated formula readback for both absolute-value and square-power wrappers.
- Added `Square-Power Formula Cases` as the promoted `caseMath` detail section.
- Preserved local Cardano/Ferrari definitions per generated branch group.
- Included the exact-zero readback polish so one-branch generated formula answers do not show redundant visible group labels.
- Added a dormant wrapper config seam for future nth-power policy without enabling non-square powers.
- Added target-shape evidence so top-level large polynomial square-power wrappers and target-denominator square-power wrappers can attempt composition after simpler routes, while generated handoff remains closed to formula route widening.
- Added a shared Real algebraic formula fallback helper so exact numeric square-power cases that pass through the shared solver still reach the square-power formula/domain-empty policy.
- Extracted that fallback helper into `symbolic-algebraic-formula-fallback.ts` to satisfy the 900-line file-size ratchet instead of raising a cap.

## Out Of Scope Preserved

- No Complex Exact square-power formula wrappers.
- No higher even-power or odd-power wrapper formula route.
- No nested/mixed algebraic wrapper formula route.
- No carrier-elimination formula handoff.
- No exp/log/trig formula wrapper route.
- No broad generated Cardano/Ferrari route-order widening.
- No `RootOf`, implicit-root output, numeric-only Exact fallback, schema, OOE, History, app-state, or Tauri changes.

## Durable Memory Updated

- `.memory/current-state.md`
- `.memory/decisions.md`
- `.memory/journal/2026-06/2026-06-25.md`
- `.memory/sessions/2026-06/2026-06-25/2026-06-25__equation-square-power-wrapper-formula1/`

## Commit Status

Implementation is verified locally. Commit is pending explicit user approval.

## Next Discussion Focus

Choose the next wrapper family after square powers. Likely candidates are a policy gate for odd/even nth-power wrappers, or a payload/readback policy for mixed legacy-plus-formula generated outputs before widening more algebraic wrappers.
