# CALCULUS-DERIVATIVES-UX-TAXONOMY1 Manual App Checklist

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

- Calculus home no longer shows a visible top-level Partials card.
- Partial Derivative is opened from Derivatives.
- Derivative screens show first-order operator controls in the lower editor strip, not in a duplicated lower context card.

## Manual App Steps

- Open `Calculus`; confirm the visible home menu shows Derivatives, Integrals, Limits, Series, Differential Equations, and Laplace Transform.
- Open `Derivatives`; confirm the menu entries are Derivative, Derivative at Point, and Partial Derivative.
- Open each derivative screen and confirm the main editor holds only the function body while the strip below it shows the operator, `f(...)`, and "With respect to".
- On Derivative at Point, set a variable and point in the strip, enter a body, run, and confirm one Answer block appears.
- On Partial Derivative, enter `x^2y+y^3`, choose `y`, run, and confirm one Answer block appears.

## Expected Results

- No lower duplicate context/control cards appear for derivative screens.
- Generated preview Copy Expr still uses the selected variable.
- F2 says `Focus Editor`.
- Display expression preview remains suppressed for body-source derivative screens.
