## Manual Checklist

- Gate: ui.

## What Is Achieved Now

- Complex Region Newton refinement has analytic derivatives where supported, finite-difference fallback where needed, supplemental seed diagnostics, and cluster-polish diagnostics.
- Root answers still require contour/subdivision verification before being shown as primary answers.

## Manual App Steps

- Open Equation > Symbolic, turn Complex On, enable Complex Region.
- Run `x^2+1+e^x/10=0` over `[-2,2] x [-2,2]`.
- Expand `Complex Search Diagnostics`.

## Expected Results

- The answer remains a verified local Complex Region result.
- `Complex Search Diagnostics` shows analytic derivative, finite-difference derivative, damping retry, and cluster polish counters.
