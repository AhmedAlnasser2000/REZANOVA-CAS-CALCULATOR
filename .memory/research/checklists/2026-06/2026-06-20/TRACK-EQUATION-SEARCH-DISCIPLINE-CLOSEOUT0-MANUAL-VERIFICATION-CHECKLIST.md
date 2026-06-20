# TRACK-EQUATION-SEARCH-DISCIPLINE-CLOSEOUT0 Manual Verification Checklist

Milestone: `EQUATION-SEARCH-DISCIPLINE-CLOSEOUT0`
Date: 2026-06-20
Agent: codex
Model: gpt-5.5

## What Is Achieved Now

- [x] Equation has a pure target-shape profiler for selected-target search.
- [x] Selected-target top-level routing and generated-handoff routing use conservative route plans.
- [x] Internal/test-facing trace evidence records profile, skipped, attempted, success, and final-stop events.
- [x] Exp/log generated equations use route-gated handoff.
- [x] Carrier, composition, and mixed-algebraic generated branches share the handoff ritual without sharing branch-specific solver judgment.
- [x] Parameterized polynomial and rational symbolic coefficient handling use the shared Equation seam.
- [x] Carrier and mixed-algebraic use shared MathJson arithmetic where parity was proven.
- [x] Linear arithmetic, cap recalibration, Exact/Isolate cleanup, and algorithm expansion remain deferred.

## Manual App Steps

- [ ] In Equation symbolic mode, solve a simple linear selected-target equation and confirm the exact answer and History replay still behave normally.
- [ ] Solve a rational selected-target case with a denominator exclusion and confirm `Valid when` facts remain visible.
- [ ] Solve an exp/log selected-target case that generates a handoff equation and confirm the existing source/readback wording remains stable.
- [ ] Solve a composition or carrier selected-target case and confirm branch/readback sections are still present.
- [ ] Try an unsupported mixed or cap-heavy case and confirm it stops with structured guidance instead of pretending to solve.
- [ ] Confirm no route trace data appears in Display, History, OOE diagnostics, app state, or persistence.

## Expected Results

- [ ] Existing solved cases continue to solve with the same visible meaning.
- [ ] Unsupported cases still explain the mathematical blocker.
- [ ] Search trace evidence remains internal/test-facing only.
- [ ] No new UI, OOE, History, app-state, Tauri, graphing, step-by-step, or Rust behavior appears from the closeout.

## Codex Verification Snapshot

- [x] Static roadmap and live repo evidence confirm all search-discipline foundation milestones are present.
- [x] Closeout is docs/memory only; no runtime source changes are required.
- [x] `npm run test:memory-protocol` passes.
- [x] `git diff --check` passes.
