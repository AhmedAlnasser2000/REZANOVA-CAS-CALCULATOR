# CALCULUS-DERIVATIVE-TARGET-ROUNDTRIP1 Completion Report

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5-codex
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5-codex
- verified_by_agent: codex
- verified_by_agent_model: gpt-5-codex
- attribution_basis: live

## Summary

- Extended persisted Calculus seeds so derivative targets accept canonical single-symbol ids beyond `x/y/z`.
- Canonicalized LaTeX-style Greek targets such as `\theta` to storage id `theta`.
- Preserved derivative-at-point `point` values in Calculus replay seeds.
- Added runtime roundtrip coverage for selected derivative target through generated preview, main-editor variable state, history replay, workspace capture/restore, OOE input revision evidence, launch ticket input, and committed history context.

## Scope Notes

- Calculate's compact derivative workbench remains visually unchanged.
- Partial Derivative is still on its existing screen until `CALCULUS-PARTIAL-DERIVATIVE1`.
- No public Display schema, OOE capability, Tauri, or worker-host changes were introduced.

## Durable Memory Updated

- `.memory/current-state.md`
- `.memory/decisions.md`
- `.memory/journal/2026-06/2026-06-29.md`
- `.memory/sessions/2026-06/2026-06-29/2026-06-29__calculus-derivative-target-roundtrip1/`
