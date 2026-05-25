# EQUATION-ISOLATION1 Completion Report

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: direct

## Status

- status: completed
- date: 2026-05-25

## Summary

`EQUATION-ISOLATION1` adds a bounded selected-target isolation pass that peels target-free algebra around exactly one target-containing island, then delegates the generated equation to existing selected-target helper files.

## Implemented

- Added `src/lib/equation/equation-selected-target-isolation.ts`.
- Supported target-free add/subtract/multiply/divide shell peeling.
- Preserved target-free denominator and nonzero facts before delegation.
- Wired Equation mode to try isolation after the existing selected-target helper chain and before final boundary readback.
- Added readback categories for one-island isolation stops such as multiple target islands, target shell factors, unsupported shells, generated unsupported equations, and isolation depth limits.
- Added coverage for single-letter targets, explicit named targets, and raw-adjacent product policy handoff.

## Boundaries

- One selected target only.
- One selected-target island only.
- No symbolic cube-root/power isolation; cases such as `34x^3-z^2=25` solved for `x` keep the existing unsupported guidance.
- No Equation symbolic stored-value substitution.
- No new solver family, result origin, history schema, graphing, `POLY-ELIM2`, source-mirror work, or Labs runner work.
