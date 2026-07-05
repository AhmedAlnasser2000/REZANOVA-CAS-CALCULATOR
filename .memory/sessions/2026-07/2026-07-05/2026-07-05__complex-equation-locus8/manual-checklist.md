## Manual Checklist

- Gate: ui.

## What Is Achieved Now

- Complex equations with target-containing `abs`, `Re`, `Im`, or conjugate carriers are treated as locus-deferred instead of analytic Complex Region solves.
- The special affine abs boundary case still returns a controlled empty solution set with evidence.
- Benchmark evidence distinguishes `locus-deferred`, `controlled-boundary`, and `bounded-region`.

## Manual App Steps

- Open Equation > Symbolic, turn Complex On, enable Complex Region, and run `\left|z-1\right|=2`.
- Open Equation > Symbolic, turn Complex On, and run `\left|2x+1\right|=x-5`.

## Expected Results

- The locus case shows an error card with `Complex Locus Policy` and does not show Complex Region roots.
- The affine abs boundary case shows `x\in\varnothing`, valid-when facts, `Complex Abs Boundary`, and `Candidate Check`.
