# CALCULUS-HIGHER-ORDER-DERIVATIVES1 Manual App Checklist

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5-codex
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5-codex
- verified_by_agent: codex
- verified_by_agent_model: gpt-5-codex
- attribution_basis: live

## What Is Achieved Now

- Ordinary higher-order derivatives entered in the derivative operator rail evaluate up to order `10`.
- Derivative at Point supports higher-order ordinary operators by differentiating first and then substituting the numeric point.
- First-order derivative behavior stays compatible.
- Mixed partial evaluation is still intentionally gated.

## Manual App Steps

- Open `Calculus > Derivatives > Derivative`.
- Enter `d^3/dt^3` in the operator rail and `t^5` in the main editor.
- Press `EXE` or `F1`.
- Open `Calculus > Derivatives > Derivative at Point`.
- Enter `d^2/dx^2` in the operator rail, `x^3` in the main editor, and point `x = 2`.
- Press `EXE` or `F1`.
- Open `Calculus > Derivatives > Partial Derivative`.
- Enter a mixed operator such as `\frac{\partial^3}{\partial x\partial y^2}` and confirm it remains controlled unsupported until the mixed partial milestone.

## Expected Results

- `d^3/dt^3(t^5)` returns `60t^2` in the single Answer block.
- `d^2/dx^2(x^3)` at `x=2` returns `12` in the single Answer block.
- Copy Result copies only the final answer.
- Mixed partials still show the planned mixed-partials controlled error.
