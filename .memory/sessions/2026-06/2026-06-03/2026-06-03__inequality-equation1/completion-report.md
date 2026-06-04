# INEQUALITY-EQUATION1 Completion Report

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

Implemented `INEQUALITY-EQUATION1` as the first bounded product-facing Equation inequality route.

Equation symbolic `Exact` mode can now solve top-level one-variable numeric-coefficient linear inequalities into real interval/set readback. The route is intentionally narrow and uses the shared inequality/value-domain substrate rather than adding a broad inequality solver.

## User-Facing Behavior

- `Exact` solves examples such as `x<2`, `x<=2`, `2x+3<=7`, and `-2x+3<7`.
- Negative linear coefficients flip the inequality direction.
- Constant true/false linear reductions can show all-real or empty-set results.
- Successful results show an inequality-set solution chip and carry conditional-real answer-domain metadata.
- `Approximate` tells the user to use `Exact` for real interval inequality sets.
- `Isolate` tells the user that isolate mode is for equation rearrangement, not inequality sets.
- `Complex On` keeps ordered inequalities on the real line and adds a real-order note.

## Internal Changes

- Added `src/lib/equation/equation-inequality.ts` as the bounded Equation inequality helper.
- Routed top-level ordered inequalities before the legacy non-equality block in Equation symbolic execution.
- Threaded optional `solutionKind` through `DisplayOutcome`, history entries/replay, app-state parsing, Rust persisted history shape, result-card readback, diagnostics summaries, and Equation OOE provenance.
- Used `INEQUALITY-CORE1` for interval/set construction and value-domain fact readback.

## Boundaries Preserved

- No non-Equation inequality adoption.
- No broad inequality parser.
- No symbolic-parameter or multivariable inequality solving.
- No quadratic/rational sign-chart inequality solving.
- No absolute-value, trig, log, or exponential inequality solving.
- No chained inequality solving.
- No `!=` route.
- No Approximate inequality sampling.
- No Isolate inequality rearrangement.
- No stored-value policy change.
- No OOE runtime behavior change.
- No Rust solver execution.

## Next

`ANSWER-DOMAIN-READBACK1` remains a natural polish follow-up if result/history/domain display needs more consistency after bounded complex and inequality adoption.
