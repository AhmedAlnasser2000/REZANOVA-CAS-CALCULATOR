# RUBI-TIER1-SYMBOLIC-COEFFICIENT-CATCHUP1 Manual Verification Checklist

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

- Calculus integral screens can integrate with a selected variable other than `x`.
- Symbolic coefficient Tier I cases can return exact rule-proof antiderivatives with visible facts.
- Exact symbolic antiderivatives should not display decimal coefficients caused by by-parts solving.

## Manual App Steps

- On Indefinite Integral, set variable to `y`, enter `y^2`, run, and confirm the preview shows `dy`.
- Set variable to `t`, enter `t e^t`, run, and confirm the result is in `t` while any `x` would remain a parameter.
- With default `x`, test `(a x+b)^5`, `sin(a x+b)`, `c^(a x+b)`, `x^3 e^(a x+b)`, `x ln(a x+b)`, and `a x^(n-1)(b+c x^n)^p`.
- Test `x^4 cos(3x-2)` and `x^4 sin(2x+1)` and inspect that coefficients are exact fractions, not decimals.
- Test `1/(a x^2+b x+c)` and inspect the visible `Valid When`/supplement facts.

## Expected Results

- Successful symbolic cases show existing visible strategies such as `direct-rule`, `u-substitution`, `integration-by-parts`, or `partial-fractions`; no public Rubi strategy appears.
- Facts such as `a\ne0`, `c>0`, `c-1\ne0`, or `4ac-b^2>0` are visible through existing supplement display.
- Unsupported symbolic cases stop cleanly without numeric-confidence symbolic adoption.
