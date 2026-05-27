# TRACK-EQUATION-ALGEBRAIC-ISOLATION1 Manual Verification Checklist

## What Is Achieved Now

- Equation symbolic selected-target solving supports bounded cube/fourth-power algebraic isolation up to degree 4.
- Even-power answers show both real branches plus `Valid when` conditions.
- Nested selected-target composition can close when generated branches reduce to this algebraic isolation helper.
- Oversized symbolic cubic/quartic formulas stop with readable guidance.

## Manual App Steps

- Open Equation > Symbolic.
- Enter `34x^3-z^2=25`, choose target `x`, and run.
- Enter `(x+a)^4=b`, choose target `x`, and run.
- Enter `a(x+b)^4+c=d`, choose target `x`, and run.
- Enter `sqrt(sqrt(x^3+a))=b`, choose target `x`, and run.
- Enter `a x^4+b x^3+c x^2+d x+e=0`, choose target `x`, and run.

## Expected Results

- The cube case returns an exact cube-root answer for `x`.
- Fourth-power cases return two real branches and show the relevant validity conditions.
- Target-free nonzero facts such as `a\ne0` remain visible when shell division is required.
- Nested algebraic composition returns an exact result through composition handoff plus algebraic isolation.
- The broad symbolic quartic returns a controlled formula-cap stop instead of a giant formula or partial roots.
