# COMPLEX-EQUATION-BRANCH-PULLBACK2 Manual Checklist

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors: user
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live

## What Is Achieved Now

- Complex Region can use direct and real-affine principal-branch pullbacks when the mapped bounded region is safe.
- Branch-policy details show mapped bounds for affine branch arguments.
- Unsupported composed branch pullbacks stop with controlled unsafe evidence instead of returning unchecked numeric roots.

## Manual App Steps

1. Open Equation > Symbolic.
2. Turn Complex On.
3. Enable Complex Region.
4. Enter `ln(x-1)+x=2`.
5. Set `Re min = 1.5`, `Re max = 2.5`, `Im min = -0.5`, `Im max = 0.5`, and `Grid = 7`.
6. Press Solve and confirm a root near `x = 2` plus `Complex Branch-Cut Policy` mapped-region evidence.
7. Enter `ln(x^2+1)+x=0`.
8. Set `Re min = 2`, `Re max = 3`, `Im min = 1`, `Im max = 2`, and `Grid = 7`.
9. Press Solve and confirm the result is a controlled unsafe branch-policy stop.

## Expected Results

- No `NaN`, `undefined`, overflow, or unreadable detail-card text appears.
- Pure exact preimage cases such as `ln(x-1)=0` may still solve through the exact Complex preimage route before Complex Region fallback.
- The app does not claim broad branch-cut certification for non-affine composed carriers.
