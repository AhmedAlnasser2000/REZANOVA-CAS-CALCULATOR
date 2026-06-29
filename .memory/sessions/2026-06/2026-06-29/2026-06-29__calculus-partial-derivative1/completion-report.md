# CALCULUS-PARTIAL-DERIVATIVE1 Completion Report

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

- Moved guided first-order Partial Derivative body editing into the shared Calculus main editor.
- Replaced the lower partial body editor with a fixed context/control card and generated preview.
- Reused the shared derivative target control and validation model for partial derivative targets.
- Widened partial generated-request parsing/building from hardcoded `x/y/z` to the supported single-symbol target set, including canonical Greek ids such as `theta`.
- Suppressed duplicate Calculus readback for partial main-editor results so the structured `Answer` block owns the visible result.

## Scope Notes

- This milestone remains first-order only.
- Higher-order partials, mixed partials, Hessians, Jacobians, and vector-calculus operators remain deferred.
- No OOE capability, worker-host, Tauri, public Display schema, or Calculate compact-workbench behavior was changed.

## Durable Memory Updated

- `.memory/current-state.md`
- `.memory/decisions.md`
- `.memory/journal/2026-06/2026-06-29.md`
- `.memory/sessions/2026-06/2026-06-29/2026-06-29__calculus-partial-derivative1/`
