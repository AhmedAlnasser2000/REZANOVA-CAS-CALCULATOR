# EQUATION-BRANCH-DOMAIN-FACTS1 Completion Report

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

- Added `src/lib/equation/facts/branch-domain-facts.ts` as an internal Equation facts seam.
- The seam wraps existing `ExactSupplementEntry` and `SolveDomainConstraint` meanings with attachment metadata for `global`, `root-set`, `root-group`, and `branch`.
- Added helpers for denominator exclusions, domain conditions, supported domain-constraint conversion, legacy supplement parsing, fact dedupe, and current raw supplement rendering.
- Refactored factorable delegated root groups to store delegated supplements as root-group facts while `rootSetExactSupplementLatex(...)` still renders the same raw strings.
- Refactored parameterized rational denominator exclusions from raw string plumbing to typed denominator-exclusion facts while preserving visible `exactSupplementLatex`.
- Added focused facts seam tests plus root/rational/factorable parity coverage.

## Gate

- gate_type: backend
- milestone: `EQUATION-BRANCH-DOMAIN-FACTS1`

## Files Updated

- `src/lib/equation/facts/branch-domain-facts.ts`
- `src/lib/equation/facts/branch-domain-facts.test.ts`
- `src/lib/equation/roots/representation.ts`
- `src/lib/equation/roots/representation.test.ts`
- `src/lib/equation/parameterized/factorable-polynomial.ts`
- `src/lib/equation/parameterized/rational.ts`
- `.memory/current-state.md`
- `.memory/decisions.md`
- `.memory/journal/2026-06/2026-06-20.md`
- `.memory/research/roadmaps/equation-substrate-roadmap.md`
- `.memory/sessions/2026-06/2026-06-20/2026-06-20__equation-branch-domain-facts1/`

## Out Of Scope Preserved

- No DisplayOutcome, History, OOE, app-state, Tauri, UI, graphing, step-by-step, cap, source-mirror, or Exact/Isolate behavior change.
- No new visible facts UI or grouped supplement rendering.
- No parsing of `detailSections` as canonical facts.
- No migration of polynomial discriminants, exp/log, trig, carrier, guarded algebra, composition, numeric interval, complex, inequality, periodic, or candidate-validation facts.
