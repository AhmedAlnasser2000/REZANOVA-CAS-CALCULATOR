# CALCULUS-INTEGRATION-NEXT350-STUDY1 Completion Report

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5-codex
- contributors: user
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5-codex
- verified_by_agent: codex
- verified_by_agent_model: gpt-5-codex
- attribution_basis: live

## Summary

Completed the next Calculus integration corpus/study gate for early textbook indefinite integrals.

- Source: Thomas/Finney Calculus and Analytic Geometry, 9th edition, Chapter 7.
- Sections covered: 7.1 Basic Integration Formulas, 7.2 Integration by Parts, 7.3 Partial Fractions, 7.4 Trigonometric Substitutions, and 7.5 Integral Tables and CAS.
- Scope stayed indefinite-only; no definite or improper integral rows were promoted.
- Promoted 350 new unique rows: `calc.int.indef.thomas.next350.0201` through `calc.int.indef.thomas.next350.0550`.
- Recorded 17 duplicate sightings in the duplicate ledger rather than rerunning them as independent unique cases.
- Appended app-level backend run rows for all 350 new cases.
- Appended Playwright visual-status run rows for all 350 new cases.
- Appended 68 open scan findings for controlled unsupported rows.

The corpus now has 550 unique Thomas/Finney indefinite-integration cases, 17 duplicate sightings, 911 run-result rows, and 68 open scan findings.

## Findings

The app-level Calculus evaluator is the correct benchmark source for app-visible output. The lower-level symbolic dispatcher alone was too strict: it missed rows that the real workspace successfully handles through guarded Compute Engine fallback plus backcheck. Future benchmark sweeps should use the same app/workspace evaluator that Playwright is visually checking.

Backend result over the new 350 rows:

- Supported: 282.
- Controlled unsupported: 68.
- Failure kinds: 23 `missing-capability`, 45 `needs-upgrade`.

Unsupported clusters:

- 14 trig identity and algebraic cleanup rows.
- 10 difference-root trig substitution rows.
- 9 trig product reduction rows.
- 8 affine trig-derivative integration-by-parts rows.
- 6 inverse-trig integration-by-parts rows.
- 6 improper rational partial-fractions rows blocked by polynomial prerequisite.
- 5 circle-root trig substitution rows.
- 5 sum-root trig substitution rows.
- 4 trig-power reduction rows.
- 1 table/hyperbolic row.

Fully supported clusters included standard log/root/exponential/trig substitution, affine trig substitution, complete-square inverse-trig/root/log forms, polynomial exponential/trig/log integration by parts, tabular exponential-trig, and distinct/repeated/mixed/irreducible partial fractions.

## Durable Memory Updated

- `.memory/current-state.md`
- `.memory/decisions.md`
- `.memory/journal/2026-07/2026-07-04.md`
- `.memory/sessions/2026-07/2026-07-04/2026-07-04__calculus-integration-next350-study1/completion-report.md`
- `.memory/sessions/2026-07/2026-07-04/2026-07-04__calculus-integration-next350-study1/verification-summary.md`

## Commit State

Commit requested on 2026-07-05 as a path-scoped commit because the shared worktree contains unrelated dirty work from other lanes.
