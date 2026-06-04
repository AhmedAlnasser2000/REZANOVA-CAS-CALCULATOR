# Track ALG-R2 Manual Verification Checklist

## Achieved Now
- `Calculate > Simplify` now performs bounded exact radical normalization for supported numeric and monomial radicals.
- `Calculate > Simplify` now rationalizes supported monomial radical denominators and square-root binomial denominators exactly.
- `Calculate > Factor` now preserves bounded radical cleanup without rationalizing denominators.
- `Calculate > Expand` now expands first, then normalizes supported radicals in the expanded result.
- `Equation > Symbolic` now normalizes supported radicals before solve, preserves radical-domain and denominator conditions as a second exact line, and rejects finite roots that violate those conditions.

## App Steps
1. In `Calculate`, enter `\sqrt{12}` and press `Simplify`.
Expected:
- exact result is `2\sqrt{3}`
- no raw LaTeX wrappers leak into the visible result text

Pass/Fail Notes:
- 

2. In `Calculate`, enter `\sqrt{x^2}` and press `Simplify`.
Expected:
- exact result is `|x|`
- no extra decimal approximation replaces the exact form

Pass/Fail Notes:
- 

3. In `Calculate`, enter `\sqrt[3]{54x^4}` and press `Simplify`.
Expected:
- exact result is `3x\sqrt[3]{2x}`
- expression stays exact

Pass/Fail Notes:
- 

4. In `Calculate`, enter `2\sqrt{3}+\sqrt{12}` and press `Simplify`.
Expected:
- exact result is `4\sqrt{3}`
- like radicals are combined

Pass/Fail Notes:
- 

5. In `Calculate`, enter `\frac{1}{\sqrt{3}}` and press `Simplify`.
Expected:
- exact result is `\frac{\sqrt{3}}{3}`
- denominator is rationalized

Pass/Fail Notes:
- 

6. In `Calculate`, enter `\frac{1}{1+\sqrt{2}}` and press `Simplify`.
Expected:
- exact result is `\sqrt{2}-1`
- conjugate rationalization works for the numeric square-root binomial

Pass/Fail Notes:
- 

7. In `Calculate`, enter `\frac{1}{x+\sqrt{2}}` and press `Simplify`.
Expected:
- result is rationalized
- second exact line shows a condition preserving the original denominator nonzero requirement

Pass/Fail Notes:
- 

8. In `Calculate`, enter `\frac{1}{\sqrt{x}+1}` and press `Simplify`.
Expected:
- result is rationalized
- second exact line includes the real-domain condition `x \ge 0`

Pass/Fail Notes:
- 

9. In `Calculate`, enter `\frac{1}{1+\sqrt{2}}` and press `Factor`.
Expected:
- bounded radical cleanup stays exact
- denominator is not rationalized in `Factor`

Pass/Fail Notes:
- 

10. In `Calculate`, enter `(1+\sqrt{12})^2` and press `Expand`.
Expected:
- expression expands first
- resulting radicals are normalized afterward
- no unexpected denominator rationalization occurs in `Expand`

Pass/Fail Notes:
- 

11. In `Equation > Symbolic`, enter `\frac{1}{\sqrt{x}}=1` and solve.
Expected:
- result keeps the valid root `x=1`
- second exact line shows compatible radical conditions including `x \ge 0` and `x \ne 0`

Pass/Fail Notes:
- 

12. In `Equation > Symbolic`, enter `\frac{1}{x+\sqrt{2}}=0` and solve.
Expected:
- no false root is produced
- second exact line preserves the denominator condition for `x+\sqrt{2}`

Pass/Fail Notes:
- 

13. In `Calculate`, enter a broader unsupported form such as `\sqrt{x+y}` and press `Simplify`.
Expected:
- bounded radical engine does not falsely claim support
- result falls back to current generic behavior cleanly

Pass/Fail Notes:
- 

## Evidence Commands
- `npm test -- --run`
- `npm run build`
- `npm run lint`
- `cargo check`
