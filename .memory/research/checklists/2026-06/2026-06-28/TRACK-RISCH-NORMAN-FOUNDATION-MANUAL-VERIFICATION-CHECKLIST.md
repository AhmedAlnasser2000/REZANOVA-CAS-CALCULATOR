# TRACK-RISCH-NORMAN-FOUNDATION Manual Verification Checklist

Date: 2026-06-28

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

- Risch-Norman is live as an internal guarded fallback for approved bounded families.
- Public strategy labels remain existing labels such as `integration-by-parts`, `direct-rule`, and `partial-fractions`.
- Symbolic RN adoption is proof/fact based, not numeric-confidence based.
- Covered visible families include symbolic polynomial coefficients times affine exp, positive-base exp, sin/cos, affine logs, mixed exp-sincos products, two-factor trig products, top-level sums, and bounded affine rational corrections.

## Manual App Steps

Use Calculus > Integrals > Indefinite Integral and evaluate these examples:

- `(c*x^2+d*x+e)e^(a*x+b)`
- `(c*x+d)q^(a*x+b)`
- `(c*x^2+d)sin(a*x+b)`
- `(c*x^2+d*x+e)cos(a*x+b)`
- `x^2 ln(a*x+b)`
- `(c*x+d)log(a*x+b)`
- `(c*x^2+d*x+g)e^(a*x+b) + x^2sin(a*x+b)`
- `x^2 e^(a*x+b)sin(c*x+d)`
- `sin(a*x+b)cos(c*x+d)`
- `A/(A+x)` with integration variable `A`

Also try these stop cases:

- `a*x+b*y=e`
- `x^2 ln(x^2+b)`
- `e^(sin(x))`
- `sin(x)*sec(x)`
- `Abs(x)ln(a*x+b)`

## Expected Results

- Supported symbolic cases return exact symbolic antiderivatives with `verified-exact` trust when available.
- Visible strategies stay public existing strategies, not `risch-norman`.
- Required facts appear in `Valid When`, including slope, base, pivot, or denominator nonzero facts where relevant.
- Stop cases return controlled unsupported or relation-input errors, not hangs, Compute Engine stalls, or numeric-confidence symbolic results.
- Copy Result should preserve exact symbolic math, not approximate ASCII output, when rendered/LaTeX notation is active.
