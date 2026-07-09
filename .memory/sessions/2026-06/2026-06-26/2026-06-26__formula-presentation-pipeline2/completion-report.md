# FORMULA-PRESENTATION-PIPELINE2 Completion Report

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live

## Gate

- Gate label: ui
- Scope: Display/UI performance for heavy formula `caseMath` answers and collapsed math-heavy detail sections.

## Summary

Large Real Cardano/Ferrari and generated-wrapper formula answers were making the app sluggish because the answer card mounted every formula row and every long row-local condition immediately. This gate adds a compact-first policy for heavy `caseMath` answers and lazy-mounts collapsed math-heavy mixed details.

## Completed

- Added a case-math size policy for row count, grouped generated branches, total LaTeX length, and per-row LaTeX length.
- Rendered heavy `caseMath` answers as a plain compact summary with row/group/character counts and an explicit `Show full formula cases` button.
- Kept full expanded rows on the existing `formula | when condition` presentation path, preserving row-local guard semantics.
- Kept global `Valid When` facts eager and unchanged for whole-result facts such as denominator exclusions, wrapper facts, and exp/log domain facts.
- Updated Display scheduling so collapsed `mixed` detail blocks containing math parts or math rows lazy-mount, while cheap prose-only details remain eager.
- Added focused DisplayPanel and AppMain UI coverage proving heavy rows are not mounted before expansion and editor hints remain responsive with a heavy compacted result present.
- Calibrated the compact policy after user QA showed `x^3+p*x^2*q+x=1` was still too heavy despite having only four rows; visually dense four-row specialized formulas now compact, while smaller direct cases stay expanded.

## Out Of Scope Preserved

- No solver behavior changes.
- No formula semantics changes.
- No generated formula handoff widening.
- No Copy Result, To Editor, History, OOE, app-state, Tauri, or persisted Display schema changes.
- No broad algebraic simplification or formula rewriting.

## Durable Memory Updated

- `.memory/current-state.md`
- `.memory/decisions.md`
- `.memory/journal/2026-06/2026-06-26.md`
- `.memory/sessions/2026-06/2026-06-26/2026-06-26__formula-presentation-pipeline2/`

## Commit Status

Implementation is verified locally. Commit is pending explicit user approval.
