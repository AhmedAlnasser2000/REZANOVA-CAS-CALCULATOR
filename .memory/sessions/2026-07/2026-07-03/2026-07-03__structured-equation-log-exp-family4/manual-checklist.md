# Structured Equation Log Exp Family 4 Manual Checklist

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live

## What Is Achieved Now

- Real exp/log inverse answers use an internal structured family before rendering current display fields.
- Exact log answers such as `x=2+\ln(5)` remain symbolic instead of being collapsed to decimal approximations.
- Symbolic-base exp/log facts stay visible through the existing `Valid when` supplement card.

## Manual App Steps

1. Open Equation -> Symbolic.
2. Solve `e^{x-2}=5`.
3. Solve `9^x=27`.
4. Solve `a^x=b`.
5. Solve `\ln(x+1)=3`.

## Expected Results

- `e^{x-2}=5` shows `x=2+\ln(5)`.
- `9^x=27` shows `x=\frac{3}{2}`.
- `a^x=b` shows `x=\log_a(b)` and expanded facts `a>0`, `a\ne1`, and `b>0`.
- `\ln(x+1)=3` shows `x=e^3-1` and the domain fact `x+1>0`.
- Answer, supplement, and detail cards remain readable and do not show `undefined`.
