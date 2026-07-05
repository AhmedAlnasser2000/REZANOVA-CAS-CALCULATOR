# COMPLEX-EQUATION-LOCAL-BOX-VALIDATION4 Manual Checklist

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

- Accepted Complex Region roots show local Krawczyk-style box validation evidence.
- Simple roots can be marked as validated local boxes when contraction stays inside the box.
- Multiple or clustered roots remain inconclusive instead of receiving unique-root claims.

## Manual App Steps

1. Open Equation > Symbolic.
2. Turn Complex On.
3. Enable Complex Region.
4. Enter `x^2+1+e^x/10=0`.
5. Set `Re min = -2`, `Re max = 2`, `Im min = -2`, `Im max = 2`, and `Grid = 1`.
6. Press Solve.
7. Expand `Complex Local Box Validation`, `Complex Contour Moments`, and `Complex Contour Verification`.

## Expected Results

- The details show `Validated local boxes: 2` and Krawczyk contraction text.
- No `NaN`, `undefined`, overflow, or unreadable detail-card text appears.
- The result still describes bounded-region evidence, not global Complex completeness.
