## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors: none
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live

## What Is Achieved Now

- Unsupported exact high-degree numeric-ready polynomial equations can fall back to validated real approximate roots.
- Rational quotient-zero equations can fall back numerically after exact symbolic solving stops, with denominator exclusions preserved.
- Numeric details include root-engine diagnostics, residuals, coefficient scale, and repeated/clustered-root warnings when applicable.

## Manual App Steps

- Enter `x^7-x=5`; confirm the result says no supported exact form was found and shows `x approx 1.300766`.
- Expand details and confirm `Polynomial Diagnostics` includes the root engine, iterations, residual, coefficient scale, and roots before/after dedupe.
- Enter `\frac{x^7-x-5}{x-2}=0`; confirm the approximate root near `1.300766` appears and `x-2\ne0` / `x\ne2` evidence remains visible.
- Enter a simple exact case such as `x+5=8`; confirm the exact symbolic answer still wins.

## Expected Results

- Degree-3/4 numeric fallback remains numeric-only and does not show Cardano/Ferrari case sections.
- Roots are validated against the original equation, not just the cleared polynomial.
- Complex numeric roots remain deferred.
