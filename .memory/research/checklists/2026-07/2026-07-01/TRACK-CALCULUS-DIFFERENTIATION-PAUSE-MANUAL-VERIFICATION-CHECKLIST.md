# CALCULUS-DIFFERENTIATION-PAUSE Manual Verification Checklist

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

- Guided Derivative, Derivative at Point, Partial Derivative, and Implicit Derivative surfaces exist under Calculus.
- Ordinary higher-order derivatives and mixed partials have symbolic evaluation paths with derivative steps details.
- Derivative-family natural editor entry, shortcut normalization, and keypad overlays are present.
- Differentiation is not the active expansion track now; it is paused for stabilization until Matrix/Vector are upgraded.

## Manual App Steps

Before resuming differentiation work later, smoke-test:

1. Calculus -> Derivatives -> Derivative: enter `d/dx(sin(x)+cos(x))`, then Evaluate.
2. Calculus -> Derivatives -> Derivative: enter `d^3/dx^3(x^5)`, then Evaluate.
3. Calculus -> Derivatives -> Partial Derivative: enter `\partial^3/(\partial x\partial y^2)(x^3y^2+z)`, then Evaluate.
4. Calculus -> Derivatives -> Derivative at Point: enter `d^2/dx^2(x^3)`, set point `x=2`, then Evaluate.
5. Calculus -> Derivatives -> Implicit Derivative: enter `x^2+y^2=25` with independent `x` and dependent `y`, then Evaluate.

## Expected Results

- `d/dx(sin(x)+cos(x))` returns `cos(x)-sin(x)`.
- `d^3/dx^3(x^5)` returns `60x^2`.
- `\partial^3/(\partial x\partial y^2)(x^3y^2+z)` returns `6x^2`.
- `d^2/dx^2(x^3)` at `x=2` returns `12`.
- `x^2+y^2=25` returns `dy/dx=-x/y` if the Equation seam can isolate the placeholder; otherwise the controlled error should be treated as stabilization backlog, not as a reason to widen Calculus with a private solver.
- Gradient, Jacobian, Hessian, divergence, curl, and Laplacian remain paused until symbolic Vector/Matrix foundations are upgraded.
