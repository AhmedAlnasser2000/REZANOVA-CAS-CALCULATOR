# TRACK-POLY-SYSTEM1 Manual Verification Checklist

## What Is Achieved Now

- Equation > Simultaneous includes a new `Polynomial 2x2` branch beside the existing linear 2x2 and 3x3 solvers.
- The branch accepts two polynomial equations in fixed variables `x` and `y`.
- Successful systems show validated real solution pairs in `Answer`, followed by projection and candidate-check details.
- Stored finite numeric constants may substitute into coefficients, while `x` and `y` stay protected.
- Underconstrained x-only/y-only input stops with guidance to write equations that relate both variables.
- Harmless MathLive spacing around operators is normalized, and inconsistent systems with nonzero constant resultants report no real solution pairs.

## Manual App Steps

1. Open `Core` > `Equation` > `Simultaneous`.
2. Confirm the menu shows `2x2`, `3x3`, and `Polynomial 2x2`.
3. Open `Polynomial 2x2`.
4. Enter `y=x^2` in the first equation row.
5. Enter `y=1` in the second equation row.
6. Press `EXE` or `F1`.
7. Try x-only input such as first row `x^2+4x` and second row `1+5x`.
8. Try an inconsistent pair such as first row `y=x^2+44` and second row `y=x^2+5`.

## Expected Results

- The valid system returns `(-1,1)` and `(1,1)` as real solution pairs.
- The result card shows `Answer` first, then details including `Polynomial System`, `Resultant Projection`, and `Candidate Check`.
- The x-only input does not pretend to solve a 2-variable system; it explains that both `x` and `y` are required and suggests an intersection-style form such as `y=x^2+4x` and `y=1+5x`.
- The inconsistent pair says no real solution pairs instead of showing a generic projection ambiguity.
