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

- `Calculus > Derivatives > Implicit Derivative` is available.
- The main editor accepts one full relation, for example `x^2+y^2=25`.
- The operator rail controls "differentiate with respect to" and "dependent variable".
- The result is isolated through the Equation seam and shown once in the Answer card.

## Manual App Steps

1. Open `Calculus`.
2. Open `Derivatives`.
3. Open `Implicit Derivative`.
4. Enter `x^2+y^2=25` in the main editor.
5. Keep independent variable `x` and dependent variable `y`.
6. Press `EXE` or `F1`.
7. Repeat with `xy+sin(y)=x`.

## Expected Results

- For `x^2+y^2=25`, the Answer card shows `dy/dx = -x/y`.
- For `xy+sin(y)=x`, the Answer card shows `dy/dx = (1-y)/(x+cos(y))`.
- The Display expression preview is suppressed for the guided main-editor screen.
- The Answer card appears exactly once.
- The `Implicit Differentiation` detail card shows the original relation and differentiated relation.
