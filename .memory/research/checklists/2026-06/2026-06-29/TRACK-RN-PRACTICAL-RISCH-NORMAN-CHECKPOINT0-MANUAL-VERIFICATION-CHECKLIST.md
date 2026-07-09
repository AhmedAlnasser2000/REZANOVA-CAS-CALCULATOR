# TRACK-RN-PRACTICAL-RISCH-NORMAN-CHECKPOINT0 Manual Verification Checklist

Date: 2026-06-29

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

- RN fallback has shared coefficient, symbolic polynomial, resultant, named-root descriptor, Hermite, LRT, and tower-basis infrastructure.
- LRT rational adoption is live for proper residuals over squarefree exact cubic denominators.
- Existing RN exp/sin/cos/log/rational families still surface through public `integration-by-parts` or `partial-fractions` labels.

## Manual App Steps

Use Calculus -> Integrals -> Indefinite unless noted.

1. Enter `1/(x^3+x+1)` and evaluate.
2. Enter `(2*x+1)/(x^3+x+1)` and evaluate.
3. Enter `x^2*e^(a*x+b)*sin(c*x+d)` and evaluate.
4. Enter `k*(2*a*x+b)/(a*x^2+b*x+c)` and evaluate.
5. Enter `1/(a*x^2+b*x+c)` and evaluate.
6. Enter `1/(x^4+x+1)` and evaluate.

## Expected Results

1. Cubic exact rational residual succeeds as `partial-fractions`, shows named `alpha_i` logarithmic terms, and includes resultant/`S_i(x)` definitions in details.
2. Cubic exact rational residual with linear numerator also succeeds through the LRT path when caps are met.
3. Mixed exp-sincos polynomial case succeeds as `integration-by-parts`, carries `a^2+c^2\ne0`, and does not expose an RN public strategy label.
4. Symbolic log-derivative succeeds as `partial-fractions`, with answer `k*ln|a*x^2+b*x+c|` in rendered math form.
5. Symbolic quadratic reciprocal shows the casewise answer for `4ac-b^2>0`, `=0`, and `<0`, with global fact `a\ne0`.
6. Degree-4 LRT adoption remains controlled unsupported or handled by an older exact-rational route if one legitimately owns it; it should not freeze or expose raw LRT internals.
