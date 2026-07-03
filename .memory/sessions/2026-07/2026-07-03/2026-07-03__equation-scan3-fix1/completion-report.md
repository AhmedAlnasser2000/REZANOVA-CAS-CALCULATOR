# EQUATION-SCAN3-FIX1 Completion Report

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

`EQUATION-SCAN3-FIX1` closes the latest 250-case Equation sweep findings without widening Equation into new 3x3 nonlinear or Groebner-style capabilities.

What changed:

- Routed scan3 systems through existing Equation simultaneous screens using optional ledger `route_hint` values.
- Normalized real trig special-angle periodic output and quadratic trig carrier roots without decimal leakage.
- Preserved exact inverse-trig forms for genuinely non-special values such as `arcsin(1/3)` and `arctan(1/2)`.
- Rendered positive numeric-base exponential inverses as natural-log quotients while preserving rational simplifications.
- Added exact affine/pure-square exp-log handling for cases such as `2^x=7`, `2^{x+1}=7`, `e^{x^2}=5`, and `ln(e^x+1)=2`.
- Preserved cancelled-hole, formula-isolation, radical-domain, and rejected-candidate evidence.
- Replaced abstract benchmark placeholders with concrete composition cases and updated `x^4+1=0` to require all four exact complex roots.
- Appended a scan3 fix run with 250 supported rows and resolved the open scan3 findings.

Boundaries preserved:

- No public `DisplayOutcome` schema expansion.
- No Symbolic reroute for systems.
- No new nonlinear 3-variable or Groebner solver.
- Ignored `.task_tmp/` visual/run scripts and screenshots remain temporary evidence, not runtime artifacts.
- Pre-existing unrelated dirty memory and Calculus/integration files from other agents were not staged.

## Durable Memory Updated

- `.memory/sessions/2026-07/2026-07-03/2026-07-03__equation-scan3-fix1/completion-report.md`
- `.memory/sessions/2026-07/2026-07-03/2026-07-03__equation-scan3-fix1/verification-summary.md`
- `.memory/sessions/2026-07/2026-07-03/2026-07-03__equation-scan3-fix1/commit-log.md`

Note: `.memory/current-state.md` and `.memory/journal/2026-07/2026-07-03.md` already contained unrelated dirty work from other agents in this shared checkout, so this gate records its durable handoff in a narrow session dossier to avoid bundling their lanes.
