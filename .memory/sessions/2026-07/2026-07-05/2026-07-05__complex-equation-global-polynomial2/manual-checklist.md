# COMPLEX-EQUATION-GLOBAL-POLYNOMIAL2 Manual Checklist

## What Is Achieved Now

- Complex numeric polynomial/rational fallback now exposes its global evidence visibly in detail cards.
- Approximate Complex polynomial/rational branch readback no longer gets summarized as exact roots by the structured trust layer.
- Rational fallback keeps denominator/pole rejection visible as part of the global-polynomial evidence.

## Manual App Steps

- Open Equation > Symbolic, turn Complex On, enter `x^6+x+1=0`, and solve.
- Confirm the answer is approximate Complex numeric roots and the details include `Global Complex Polynomial Evidence`.
- Enter `(x^6+x+1)/x=0`, solve, and confirm the details show `Branch policy: pole-aware` plus `x != 0`.

## Expected Results

- Polynomial case: visible global-polynomial scope, global verification status, degree cap, and no generic `Exact roots` summary for approximate numeric roots.
- Rational case: accepted roots exclude denominator/pole candidates, domain exclusion remains readable, and the route remains approximate numeric.
