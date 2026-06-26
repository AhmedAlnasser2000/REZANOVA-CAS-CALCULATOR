# RUBI-TIER1-POLY-BYPARTS-FEEDER1 Completion Report

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

- label: backend

## Summary

- Added an internal expanded-polynomial factor feeder for the existing integration-by-parts route.
- Preserved current by-parts precedence by trying normal `tryPartsRule()` before expanding any polynomial-like factors.
- Kept successful feeder results under visible `integration-by-parts` and adopted them only after exact backcheck against the original compact integrand.
- Tightened the existing polynomial-times-trig by-parts readback so additive polynomial coefficients are grouped before multiplying by `sin` or `cos`.

## Boundaries

- No public `CalculusIntegrationStrategy`, result schema, Display, History, OOE, Tauri, workspace, or persistence changes.
- No Rubi source import, runtime source-mirror dependency, recurrence machinery, public Rubi metadata, or lazy tier import.
- Branch-sensitive carriers, roots, division, negative/fractional algebraic powers, and over-degree polynomial expansions remain controlled stops.
- UI/display dirty-lane files were intentionally untouched.

## Durable Memory Updated

- `.memory/current-state.md`
- `.memory/decisions.md`
- `.memory/journal/2026-06/2026-06-26.md`
- `.memory/research/roadmaps/rubi-integration-roadmap.md`
- `.memory/sessions/2026-06/2026-06-26/2026-06-26__rubi-tier1-poly-byparts-feeder1/completion-report.md`
- `.memory/sessions/2026-06/2026-06-26/2026-06-26__rubi-tier1-poly-byparts-feeder1/verification-summary.md`
- `.memory/sessions/2026-06/2026-06-26/2026-06-26__rubi-tier1-poly-byparts-feeder1/commit-log.md`
