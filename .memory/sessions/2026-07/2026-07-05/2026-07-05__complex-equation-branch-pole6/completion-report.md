## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live

## Completion Report

- Gate: ui.
- Milestone: Complex Equation Numeric Roadmap frontier 6, branch cuts, poles, and principal semantics.
- Added a meromorphic pole policy for Complex Region solving that detects denominator, negative-power, and direct tangent pole carriers in the selected rectangular region.
- Changed contour verification to interpret winding as zeros minus known poles, so verified local root counts use `winding + known interior pole multiplicity`.
- Threaded branch-cut and pole policy through subdivision at the cell level, allowing subdivision to inspect safe cells while unsafe branch/pole cells remain controlled terminal evidence.
- Added explicit evaluator pole diagnostics for division by zero, negative integer powers at zero, and tangent poles.
- Rendered pole policy and pole-aware contour evidence through existing detail cards without changing `DisplayOutcome`.
- Shared `.memory/current-state.md`, `.memory/decisions.md`, and `.memory/journal/2026-07/2026-07-05.md` were already dirty from other active lanes, so this gate records durable memory in this session dossier and leaves those shared files untouched.

## Files

- `src/lib/equation/complex/meromorphic-policy.ts`
- `src/lib/equation/complex/meromorphic-policy.test.ts`
- `src/lib/equation/complex/contour-winding.ts`
- `src/lib/equation/complex/contour-winding.test.ts`
- `src/lib/equation/complex/numeric-evaluator.ts`
- `src/lib/equation/complex/numeric-evaluator.test.ts`
- `src/lib/modes/equation/complex-region-subdivision.ts`
- `src/lib/modes/equation/complex-region-nonlinear-solve.ts`
- `src/lib/modes/equation/complex-region-nonlinear-solve.test.ts`
