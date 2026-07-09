# CALCULUS-MIXED-PARTIALS1 Manual App Checklist

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

- Partial Derivative evaluates compact higher/mixed partial operators up to order `10`.
- The written operator remains visible exactly as entered.
- Computation follows the rightmost-first applied order already shown by the rail.
- Stored values do not replace variables that are part of the mixed derivative path.

## Manual App Steps

- Open `Calculus > Derivatives > Partial Derivative`.
- Enter `\frac{\partial^3}{\partial x\partial y^2}` in the operator rail and `x^3y^2+z` in the main editor.
- Confirm the rail readback shows written `x, y^2` and applied `y -> y -> x`.
- Press `EXE` or `F1`.
- Enter `\frac{\partial^2}{\partial x\partial y}` in the operator rail and `\sin(xy)` in the main editor.
- Press `EXE` or `F1`.

## Expected Results

- `\frac{\partial^3}{\partial x\partial y^2}(x^3y^2+z)` returns `6x^2` in the single Answer block.
- `\frac{\partial^2}{\partial x\partial y}(\sin(xy))` returns `\cos(xy)-xy\sin(xy)` in the single Answer block.
- Copy Expr preserves the canonical compact operator.
- No duplicate answer appears.
