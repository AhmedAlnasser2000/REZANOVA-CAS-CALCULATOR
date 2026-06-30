# CALCULUS-DERIVATIVE-OPERATOR-RAIL1 Manual App Checklist

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

- Derivative, Derivative at Point, and Partial Derivative screens use an editable operator rail.
- The main editor still contains only the function body.
- The operator rail can preview and copy first-order, higher-order ordinary, and compact mixed partial operators.
- Higher-order and mixed evaluation remain intentionally gated until the next capability milestones.

## Manual App Steps

- Open `Calculus > Derivatives > Derivative`.
- Enter `d^3/dt^3` in the operator rail and `t^5` in the main editor.
- Confirm the generated preview copies `\frac{d^{3}}{dt^{3}}\left(t^5\right)`.
- Press `EXE` or `F1`; confirm the controlled higher-order unsupported message appears.
- Open `Calculus > Derivatives > Partial Derivative`.
- Enter `\frac{\partial^3}{\partial x\partial y^2}` in the operator rail and `x^3y^2+z` in the main editor.
- Confirm the rail shows written factors and applied order, then copy the generated expression.
- Press `EXE` or `F1`; confirm the controlled mixed-partials unsupported message appears.

## Expected Results

- No variable shortcut-chip clutter appears in the operator rail.
- The rail label and operator text are readable on the pale Calculus display surface.
- Copy Expr uses canonical compact operator LaTeX.
- Exactly one Answer block appears for supported first-order evaluations.
- Unsupported higher/mixed paths show controlled errors rather than trying to compute.
