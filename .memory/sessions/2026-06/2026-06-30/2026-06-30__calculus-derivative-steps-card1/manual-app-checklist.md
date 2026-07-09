# CALCULUS-DERIVATIVE-STEPS-CARD1 Manual App Checklist

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

- Guided derivative results still show one final Answer card.
- A separate collapsed `Derivative Steps` detail card is available for supported derivative, derivative-at-point, and partial-derivative runs.
- The steps card shows operator, applied order, derivative stages, and derivative-at-point substitution evidence.

## Manual App Steps

1. Open `Calculus > Derivatives > Derivative`, enter `t^5`, set the operator rail to `d^3/dt^3`, and run.
2. Confirm the Answer card shows `60t^2`, then open `Derivative Steps`.
3. Open `Calculus > Derivatives > Derivative at Point`, enter `x^3`, set `d^2/dx^2`, point `2`, and run.
4. Confirm the Answer card shows `12`, then open `Derivative Steps`.
5. Open `Calculus > Derivatives > Partial Derivative`, enter `x^3y^2+z`, set `partial^3/partial x partial y^2`, and run.
6. Confirm the Answer card shows `6x^2`, then open `Derivative Steps`.

## Expected Results

- Each run has exactly one Answer card.
- `Derivative Steps` starts collapsed and opens separately from the Answer card.
- Higher-order derivative steps include `D_1=5t^4`, `D_2=20t^3`, and `D_3=60t^2`.
- Derivative-at-point steps include the symbolic derivative sequence and a final substitution line at `x=2`.
- Mixed partial steps preserve the applied order `y -> y -> x` and end at `D_3=6x^2`.
