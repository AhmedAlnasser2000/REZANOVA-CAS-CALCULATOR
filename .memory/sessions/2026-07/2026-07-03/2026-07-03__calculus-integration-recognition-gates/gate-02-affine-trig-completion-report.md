# CALCULUS-INTEGRATION-AFFINE-TRIG-DERIVATIVE1 Completion Report

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live

## Summary

`CALCULUS-INTEGRATION-AFFINE-TRIG-DERIVATIVE1` extends indefinite-integration derivative-product matching to symbolic affine trig arguments.

What changed:

- Added `src/lib/symbolic-engine/integration/trig-derivative-products.ts` as an integration-owned derivative-product matcher.
- Separates target-free scalar factors from the two trig factors before matching.
- Supports `sec(u)tan(u)`, `csc(u)cot(u)`, and `sin(u)cos(u)` when `u` is symbolic affine in the selected variable.
- Handles symbolic slopes such as `\pi/2` and scalar coefficients such as `-\pi`.
- Emits visible affine-slope nonzero evidence through the existing exact supplement path.
- Dispatches accepted products as `u-substitution` and keeps derivative backcheck as the adoption gate.

Boundaries preserved:

- Indefinite integration only.
- No Equation type imports or Equation route edits.
- No shared Display contract changes.
- No definite-integral widening.
- The matcher lives outside the already-large `rules.ts` file to preserve the file-size ratchet.

## Durable Memory Updated

- `.memory/sessions/2026-07/2026-07-03/2026-07-03__calculus-integration-recognition-gates/gate-02-affine-trig-completion-report.md`
- `.memory/sessions/2026-07/2026-07-03/2026-07-03__calculus-integration-recognition-gates/gate-02-affine-trig-verification-summary.md`
- `.memory/sessions/2026-07/2026-07-03/2026-07-03__calculus-integration-recognition-gates/gate-02-affine-trig-commit-log.md`

Note: shared memory files remain intentionally unstaged because they contain unrelated dirty memory-hygiene work from another lane.
