# Milestone 03: Calculus Core

## What changed
- `Calculus` and `Functions` pages are now active.
- `Calculus` is now a launcher-visible page with a guided workbench for derivative, derivative-at-point, integral, and limit workflows.
- You can enter derivatives, derivative-at-point expressions, indefinite integrals, definite integrals, limits, and common functions such as `sin`, `cos`, `tan`, `log`, and `ln`.
- Exact symbolic results are still preferred first, but definite integrals, limits, and derivative-at-point can fall back to numeric approximations with clear warnings.
- Indefinite integrals now include a small in-repo rule layer for common single-variable antiderivatives.
- Limits now support finite targets and `±∞` in the guided workbench.

## What the new pages mean
- `Calculus`: derivative, derivative-at-point, indefinite integral, definite integral, limit
- `Functions`: `sin`, `cos`, `tan`, `log`, `ln`

## Where to find important symbols
- `d/dx`: `Calculus`
- `d/dx|`: `Calculus`
- `∫`: `Calculus`
- `∫ab`: `Calculus`
- `lim`: `Calculus`
- `sin`, `cos`, `tan`, `log`, `ln`: `Functions`

## How to use the new symbols
- Use `d/dx` when you want the derivative as an expression.
- Use `d/dx|` when you want the derivative evaluated at one numeric point.
- Use `∫` for an indefinite integral.
- Use `∫ab` for a definite integral with numeric lower and upper bounds.
- Use `lim` for a single-variable limit near a finite target or toward `±∞`.
- Use `Functions` to insert structured `sin`, `cos`, `tan`, `log`, and `ln` notation.

## Worked examples
1. Symbolic derivative
   - Open `Calculus`
   - Insert `d/dx`
   - Enter `x^3+2x`
   - Press `EXE`
   - Expect `3x^2+2`
2. Derivative at a point
   - Insert `d/dx|`
   - Enter `x^2`
   - Set `x=3`
   - Press `EXE`
   - Expect `6`
3. Indefinite integral
   - Insert `∫`
   - Enter `x^2`
   - Press `EXE`
   - Expect `x^3/3`
4. Definite integral with fallback
   - Insert `∫ab`
   - Set `0`, `1`, and `sin(x^2)`
   - Press `EXE`
   - Expect a numeric value with a warning if symbolic integration is unavailable
5. Limit with fallback
   - Insert `lim`
   - Set target `0`
   - Enter `sin(x)/x`
   - Press `EXE`
   - Expect `1` with a numeric-approximation warning when needed
6. Limit at infinity
   - Open `Calculus > Limit`
   - Set target kind to `+∞`
   - Enter `(3x^2+1)/(2x^2-5)`
   - Press `EXE`
   - Expect `1.5`

## Common mistakes
- `d/dx` returns a derivative expression, while `d/dx|` evaluates the derivative at one point.
- `∫` and `∫ab` are not interchangeable. `∫` has no bounds; `∫ab` requires numeric bounds.
- Indefinite integrals are still symbolic-only even when some extra rule-based antiderivatives now succeed.
- A warning about numeric fallback means the app is showing an approximation, not a closed-form symbolic answer.
- Some limits are still too unstable for this milestone. In those cases, Calcwiz returns a controlled message.

## Exact vs numeric
- Derivatives and simple antiderivatives prefer symbolic exact output, including some rule-based symbolic antiderivatives.
- Definite integrals and limits may use numeric fallback when symbolic evaluation is not available or not reliable.
- Numeric fallback is always marked with a warning instead of pretending to be an exact symbolic result.

## Best modes for this milestone
- `Calculate` for direct calculus evaluation
- `Table` for building sampled function tables with `sin`, `cos`, `tan`, `log`, and `ln`
- `Equation` mainly when you want to compose calculus notation as part of a larger symbolic expression
