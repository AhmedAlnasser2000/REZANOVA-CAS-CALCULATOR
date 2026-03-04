# Milestone 01: Algebra Core

## What changed
- `Algebra` and `Relations` pages are now active.
- Algebra notation is curated around the currently-supported CAS behaviors.
- Visible relation symbols now fail with controlled messages instead of raw parser errors when the feature is not part of this milestone.
- Factoring now includes common symbolic algebra patterns such as common factors and difference of squares instead of relying only on numeric-style cases.

## What the new pages mean
- `Algebra`: nth root, subscript, absolute value, grouped powers, reciprocal powers, brackets, braces
- `Relations`: `=`, `≠`, `<`, `>`, `≤`, `≥`

## Where to find important symbols
- `ⁿ√`: `Algebra`
- `xₙ`: `Algebra`
- `|x|`: `Algebra`
- `( )ⁿ`: `Algebra`
- `x⁻¹`: `Algebra`
- `=`, `≠`, `<`, `>`, `≤`, `≥`: `Relations`

## How to use the new symbols
- Use `Algebra` when you need structured notation.
- Use `F1` in `Calculate` for `Simplify`.
- Use `F2` in `Calculate` for `Factor`.
- Use `F3` in `Calculate` for `Expand`.
- Use `F4` in `Calculate` for `Numeric`.
- Use `Equation > Symbolic` for solving equations with `=`.

## Worked examples
1. Factor a quadratic
   - Enter `x^2-5x+6` from `Core`
   - Press `F2`
   - Expect factors in textbook form
2. Solve an equation
   - Go to `Equation > Symbolic`
   - Enter `x^2-5x+6=0`
   - Press `EXE` or `F1`
   - Expect exact roots first
3. Use absolute value
   - Open `Algebra`
   - Insert `|x|`
   - Fill the placeholder with an expression
   - Simplify or evaluate
4. Use grouped power
   - Insert `( )ⁿ`
   - Put `x+1` inside the group
   - Set exponent to `2`
   - Expand with `F3`
5. Use nth root
   - Insert `ⁿ√`
   - Fill the index and radicand
   - Evaluate or simplify as supported

## Common mistakes
- `x^2` is not the same as `(x+1)^2`; grouped powers matter.
- `Calculate` does not solve equations. It redirects you to `Equation`.
- `≠`, `<`, `>`, `≤`, `≥` are visible for notation in this milestone, but inequality solving is not implemented yet.
- If you want decimals, use `Numeric` or read the approximation line.

## Exact vs numeric
- Exact output remains the primary line.
- Decimal approximations are shown when available.
- If the engine cannot give a symbolic result for a visible notation, the app should return a controlled message instead of leaking parser details.

## Best modes for this milestone
- `Calculate`: simplify, factor, expand, numeric evaluation
- `Equation > Symbolic`: equation solving in `x`
- `Equation > Polynomial`: guided quadratic, cubic, quartic flows
