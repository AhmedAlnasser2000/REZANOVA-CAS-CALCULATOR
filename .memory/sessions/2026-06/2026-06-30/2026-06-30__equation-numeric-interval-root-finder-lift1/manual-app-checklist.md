## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors: none
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live

## What Is Achieved Now

- Numeric Interval Solve and bounded nonlinear auto-search share the lifted Brent-Dekker style bracket refinement.
- Pole/discontinuity brackets are not accepted as roots unless residual validation succeeds.
- Dropped pole-like candidates remain visible through `Extraneous Solutions` evidence.

## Manual App Steps

- In Equation, enable Numeric Interval for `tan(x)=1`, choose `[0,10]`, and run.
- In Equation, enable Numeric Interval for `sin(x)/x=0`, choose `[0,10]`, and run.
- In Equation normal solve, run `ln(x-1)+1/(x-2)=3`.
- In Equation normal solve, run `(x-0.3)^2+sin(x-0.3)^2=0`.

## Expected Results

- `tan(x)=1` returns local roots near `0.785398`, `3.926991`, and `7.068583` with pole facts.
- `sin(x)/x=0` returns local roots in the chosen interval and excludes `x=0`.
- `ln(x-1)+1/(x-2)=3` returns validated approximate roots near `2.372685` and `20.00011`, with `x≈2` shown as extraneous evidence rather than an accepted root.
- The tangent/no-sign-change fixture recovers the root near `0.3`.
