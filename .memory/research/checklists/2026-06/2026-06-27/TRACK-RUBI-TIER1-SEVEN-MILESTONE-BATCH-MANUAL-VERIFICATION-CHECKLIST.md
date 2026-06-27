# TRACK-RUBI-TIER1-SEVEN-MILESTONE-BATCH Manual Verification Checklist

Date: 2026-06-27
Repo: `/home/ahmed/Downloads/Calculator`
Gate: backend + ui

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

- Exact-rational repeated quadratic reciprocal powers cover positive nonsquare constants, completed-square quadratics, affine numerators, and up to two irreducible quadratic factor groups under bounded partial fractions.
- Exact-rational affine-log by-parts covers bounded polynomial factors times `ln(m*x+n)` or `log(m*x+n)`.
- Exact-rational reciprocal binomial substitution covers derivative-present `C*x^(-n-1)*(a+b*x^(-n))^p` forms.
- Large/nested Calculus answer and generated-preview cards have layout room and scrolling instead of cropping.
- Public Calculus strategy names, Display/History/OOE/Tauri/persistence schemas, and copy contracts remain unchanged.

## Manual App Steps

1. Open Calculus, Integrals, Indefinite. Enter `1/(2+x^2)^2` and evaluate.
2. Enter `1/(x^2+2x+3)^2` and evaluate.
3. Enter `(x+1)/(2+x^2)^3` and evaluate.
4. Enter `1/((x^2+1)(x^2+4))` and evaluate.
5. Enter `x ln(2x+3)` and evaluate.
6. Enter `x^(-3)/(1+x^(-2))` and evaluate.
7. Enter `(2x+3)^12` and evaluate, then inspect the answer card.
8. Enter a long rational partial-fraction case such as `(x+1)/((2x-1)^2(3x+2))` and inspect the answer card.
9. In the lower generated-preview card, inspect a long generated integral request before evaluating.
10. Use Copy Expr and Copy Result on at least one successful case.

## Expected Results

- Steps 1 through 4 resolve through visible `partial-fractions` with verified backcheck.
- Step 5 resolves through visible `integration-by-parts`.
- Step 6 resolves through visible `u-substitution`.
- Step 7 keeps the answer readable with vertical room or scrolling; the answer is not cropped.
- Step 8 keeps long rational output readable with scrolling when needed.
- Step 9 shows the generated request preview without cropping tall/nested math.
- Step 10 preserves copy behavior: Copy Expr copies the generated integral request and Copy Result copies the antiderivative/result.

## Follow-Up Watch

- The full backend integration suite is still dominated by the rational partial-fraction primitive test and exact verification cost, not by classifier route-search overhead.
- Base-10 `log` exact symbolic cancellation through `ln(10)` remains deferred.
- Symbolic coefficient widening remains intentionally deferred for these Tier-1 families.
