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

- Piecewise rows can use interval conditions such as `0 <= x < 5`.
- Finite targets select the correct side branch through the interval.
- Infinity targets can select branch conditions such as `x >= 5`.

## Manual App Steps

- Open `Calculus > Limits > Limit`.
- Press `Piecewise`.
- Set the limit target to `x -> 3`.
- Enter row 1 as expression `x`, condition `0 <= x < 5`.
- Enter row 2 as expression `0`, condition `Otherwise`.
- Evaluate.

## Expected Results

- The condition remains readable as `0 <= x < 5`.
- The body readback renders the cases form.
- The result is `3` with exactly one Answer card.
