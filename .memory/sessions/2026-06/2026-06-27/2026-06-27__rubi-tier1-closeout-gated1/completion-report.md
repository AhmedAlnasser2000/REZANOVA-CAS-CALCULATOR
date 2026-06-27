# RUBI-TIER1-CLOSEOUT-GATED1 Completion Report

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5-codex
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5-codex
- verified_by_agent: codex
- verified_by_agent_model: gpt-5-codex
- attribution_basis: live

## Backend Gates 1-3

- `CALCULUS-INTEGRATION-CE-FALLBACK-GUARD1`: removed eager Compute Engine indefinite-integral evaluation from the Calculus indefinite workspace path. Calcwiz symbolic integration now runs first, with CE available only as a guarded lazy fallback for selected-variable-only, bounded-size expressions.
- `RUBI-TIER1-TARGET-FREE-POLY-DIRECT1`: added an internal direct-rule helper for polynomial-in-selected-variable integrands `P(v)/D`, with degree cap `6`, target-free coefficients/denominator, visible `D\ne0` supplement facts, and no claim when the denominator depends on the selected variable.
- `RUBI-TIER1-TRIG-SUBSTITUTION-RADICALS1`: added exact-rational affine radical formulas for `sqrt(r-u^2)`, `sqrt(r+u^2)`, and `sqrt(u^2-r)` under existing `u-substitution` routing. Accepted cases use rule-proof exactness, not numeric-confidence adoption.
- Split rational partial-fraction integration tests into `integration-rational-partial-fractions.test.ts` so the main integration test file stays under the file-size cap while preserving the same coverage.

## Remaining Gates

- `MATH-COPY-MATHLIVE-NOTATION1`: Copy Result now returns reusable exact LaTeX for rendered/LaTeX notation modes, while plain-text notation remains the explicit plain output path.
- `DISPLAY-VALID-WHEN-STACK1`: safe comma-separated relational supplements are split into separate `Valid When` math rows without changing public result or Display schemas.
- `RUBI-TIER1-CLOSEOUT-AUDIT0`: added a closeout audit and manual checklist stating that agreed Rubi Tier I is closed for current exact-rational plus target-free symbolic scope, with broader symbolic assumptions, full Euler substitutions, Risch/Risch-Norman, and research-grade CAS breadth deferred.
