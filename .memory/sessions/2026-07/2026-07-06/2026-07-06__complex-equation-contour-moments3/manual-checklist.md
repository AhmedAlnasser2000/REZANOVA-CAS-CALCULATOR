# COMPLEX-EQUATION-CONTOUR-MOMENTS3 Manual Checklist

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

- Complex Region can recover missing Newton seeds with contour moments when a safe cell has one or two roots.
- Moment seed counts and accepted moment seed counts are visible in the answer details.
- Roots accepted from moment seeds still pass residual validation and contour-count agreement.

## Manual App Steps

1. Open Equation > Symbolic.
2. Turn Complex On.
3. Enable Complex Region.
4. Enter `x^2+1+e^x/10=0`.
5. Set `Re min = -2`, `Re max = 2`, `Im min = -2`, `Im max = 2`, and `Grid = 1`.
6. Press Solve.
7. Confirm the result shows two local Complex Region roots.
8. Expand `Complex Search Diagnostics`, `Complex Contour Moments`, and `Complex Contour Verification`.

## Expected Results

- The details show `Contour moment seeds: 2`, `Contour-moment fallback: attempted`, `Moment seeds accepted: 2`, and `Contour count verified: 2 roots in this region`.
- No `NaN`, `undefined`, overflow, or unreadable detail-card text appears.
- The result still says local/bounded region, not global completeness.
