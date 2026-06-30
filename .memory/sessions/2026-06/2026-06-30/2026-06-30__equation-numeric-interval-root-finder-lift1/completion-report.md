## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5-codex
- contributors: none
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5-codex
- verified_by_agent: codex
- verified_by_agent_model: gpt-5-codex
- attribution_basis: live

## Summary

- Implemented `EQUATION-NUMERIC-INTERVAL-ROOT-FINDER-LIFT1` as a backend Equation numeric milestone.
- Replaced the old secant/bisection interval bracket refinement with a bracket-first Brent-Dekker style interpolating refinement and bisection fallback.
- Kept candidate acceptance residual-based so discontinuity/pole brackets cannot become accepted roots merely because the bracket is tiny.
- Preserved validation-visible extraneous evidence by seeding failed sign-change brackets into candidate validation rather than accepting them as roots.
- Kept the interval route target-aware and shared by manual Numeric Interval Solve plus bounded nonlinear auto-search.

## Scope Notes

- No new nonlinear route, polynomial engine behavior, Complex numeric output, Display schema, Formula Viewer contract, OOE, History, Tauri, app-state, or persisted schema changes.
- Unrelated Calculus/symbolic-engine dirty files were left unstaged.

## Durable Memory Updated

- `.memory/current-state.md`
- `.memory/decisions.md`
- `.memory/journal/2026-06/2026-06-30.md`
- `.memory/sessions/2026-06/2026-06-30/2026-06-30__equation-numeric-interval-root-finder-lift1/`
