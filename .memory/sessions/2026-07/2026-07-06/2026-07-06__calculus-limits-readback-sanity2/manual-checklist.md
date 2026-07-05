# CALCULUS-LIMITS-READBACK-SANITY2 Manual Checklist

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5-codex
- contributors: user
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5-codex
- verified_by_agent: codex
- verified_by_agent_model: gpt-5-codex
- attribution_basis: live

## What Is Achieved Now

- Small parameter-dependent Limit answers display as readable `L = cases` rows.
- Limits method cards no longer show smashed rewrite prose as italic math.
- Piecewise Limit approach input accepts common infinity spellings and canonicalizes them.

## Manual App Steps

1. Open Calculus > Limits > Limit.
2. Enter `lim x -> infinity a*x` and evaluate.
3. Confirm the Answer card shows three direct cases and does not say `guarded rows`.
4. Enter `lim x -> 0 1/x - 1/sin(x)` and evaluate.
5. Open `Limit Method` and confirm the common-denominator rewrite text is readable.
6. Enter `lim x -> infinity sqrt(x^2+x)-x` and evaluate.
7. Open `Limit Method` and confirm the radical/conjugate method text is readable and the answer is `1/2`.
8. Insert Piecewise, focus the approach field, and type `infinty`, `infty`, `infinity`, or `∞`.
9. Confirm the approach normalizes to `\infty` without breaking the row editor.

## Expected Results

- No duplicate Answer block appears.
- No `L \in cases`, `guarded rows`, `substack`, or glued phrase like `combinedlocalalgebra...` is visible in these checked surfaces.
- Existing piecewise row editing, row removal, focus, and reorder behavior stays stable.
