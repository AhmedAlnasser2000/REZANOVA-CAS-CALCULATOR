# EQUATION-CUBIC-CARDANO-POLYNOMIAL-NORMALIZATION2 Manual Verification Checklist

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live

## What Is Achieved Now

- Top-level rational equations whose denominator clearing produces a direct cubic solve through Real or Complex Cardano.
- Existing rational linear/quadratic clearing still owns lower-degree rational equations.
- Denominator exclusions are preserved alongside Cardano facts.
- Cleared quartics remain Ferrari-deferred, and generated/wrapper Cardano remains non-live.

## Manual App Steps

- Real Exact, Complex Off: `\frac{a*x^3+b*x^2+c*x+d}{x-m}=0`.
- Complex Exact, Complex On: `\frac{a*x^3+b*x^2+c*x+d}{x-m}=0`.
- Real Exact, Complex Off: `\frac{1}{z-a}=b`.
- Real Exact, Complex Off: `\frac{a*x^4+b*x^3+c*x^2+d*x+f}{x-m}=0`.
- A wrapper/generated case such as `\ln(x^3+x+1)=b`.

## Expected Results

- Rational-cleared Real cubic shows a Real Cardano case answer and Valid When includes `x-m\ne0` plus `a\ne0`.
- Rational-cleared Complex cubic shows three compact Cardano branch rows and Valid When includes `x-m\ne0`, `a\ne0`, and `R\ne0`.
- The linear rational equation still solves through the existing rational route.
- The quartic-cleared rational equation remains stopped as Ferrari-deferred.
- The wrapper/generated cubic does not attempt live Cardano.
