## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5-codex
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5-codex
- verified_by_agent: codex
- verified_by_agent_model: gpt-5-codex
- attribution_basis: live

## Completion Report

- Gate: backend.
- Milestone: Complex Equation Numeric Roadmap frontier 3, benchmark-first automatic region runs.
- Added `runEquationComplexBenchmarkRegionFallback`, a runner-only Complex companion helper that keeps normal exact/global-polynomial routes first, then tries the agreed staged bounded regions `[-2,2] x [-2,2]` and `[-10,10] x [-10,10]`.
- The helper emits ledger-shaped Complex evidence for global-polynomial and bounded-region runs without expanding the public `DisplayOutcome` schema or app auto-run behavior.
- Verified zero-root regions are recorded as `bounded-region`/`contour-verified` evidence with status `bounded-region-zero-roots`, not as supported benchmark answers.
- Shared `.memory/current-state.md`, `.memory/decisions.md`, and `.memory/journal/2026-07/2026-07-05.md` were already dirty from another active lane, so this gate records durable memory in this session dossier and leaves those shared files untouched.

## Files

- `src/lib/modes/equation/complex-benchmark-region-runner.ts`
- `src/lib/modes/equation/complex-benchmark-region-runner.test.ts`
- `src/lib/modes/equation.ts`
