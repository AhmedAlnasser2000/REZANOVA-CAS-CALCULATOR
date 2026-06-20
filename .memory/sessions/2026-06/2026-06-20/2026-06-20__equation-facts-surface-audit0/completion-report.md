# EQUATION-FACTS-SURFACE-AUDIT0 Completion Report

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors:
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live

## Summary

- Audited current Equation fact surfaces after the root representation seam.
- Recorded that facts currently live across:
  - `SolveDomainConstraint`
  - `ExactSupplementEntry`
  - rendered `exactSupplementLatex`
  - `PeriodicFamilyInfo`
  - `branchReadback`
  - candidate-validation metadata
  - prose `detailSections`
- Locked the next implementation direction: reuse the existing typed domain constraint and exact-supplement bridge, avoid parsing detail sections, and keep `exactSupplementLatex` as rendered compatibility output.
- Recommended `EQUATION-BRANCH-DOMAIN-FACTS1` as the narrow follow-up, starting with factorable root groups and rational denominator exclusions before wider guarded algebra/composition adoption.

## Gate

- gate_type: backend
- milestone: `EQUATION-FACTS-SURFACE-AUDIT0`

## Files Updated

- `.memory/research/audits/equation-facts-surface-audit0-2026-06-20.md`
- `.memory/current-state.md`
- `.memory/decisions.md`
- `.memory/journal/2026-06/2026-06-20.md`
- `.memory/research/roadmaps/equation-substrate-roadmap.md`
- `.memory/sessions/2026-06/2026-06-20/2026-06-20__equation-facts-surface-audit0/`

## Out Of Scope Preserved

- No source code changes.
- No solver behavior or cap changes.
- No Display, History, OOE, app-state, Tauri, UI, graphing, step-by-step, source-mirror, or Exact/Isolate changes.
