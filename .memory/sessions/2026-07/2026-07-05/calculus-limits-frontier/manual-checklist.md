# Calculus Limits Frontier Manual Checklist

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live

## What Is Achieved Now

- The Limit screen has one natural limit-expression editor with readable parsed cells and a structured Piecewise row editor.
- Limits now cover stronger finite leading terms, infinity scale comparison, rewrite/cancellation retries, Piecewise branch selection, absolute-value side behavior, MRV-lite examples, compact proof cards, and a seed corpus harness.
- Gruntz is not live yet, but the foundation contracts now exist for MRV sets, scale comparability, rewrite-to-`w`, and sign/limit extraction fixtures.

## Manual App Steps

- Try `lim x -> infinity log(x)/x`.
- Try `lim x -> 0 sin(1/x)`.
- Try `lim x -> infinity a*x`.
- Use the Limit `Piecewise` keypad entry, add rows, reorder rows, remove Piecewise, and evaluate `lim x -> 0 piecewise(x if x < 0; x^2 otherwise)`.

## Expected Results

- `log(x)/x` returns `0` with readable scale evidence.
- `sin(1/x)` reports that the two-sided limit does not exist with oscillation evidence.
- `a*x` returns guarded cases for `a > 0`, `a = 0`, and `a < 0`.
- The Piecewise row editor stays editable, restores Copy Expr/preview, and the sample Piecewise limit returns `0`.
