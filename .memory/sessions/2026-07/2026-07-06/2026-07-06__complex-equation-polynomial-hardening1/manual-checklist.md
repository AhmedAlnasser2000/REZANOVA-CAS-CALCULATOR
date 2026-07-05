# COMPLEX-EQUATION-POLYNOMIAL-HARDENING1 Manual Checklist

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5-codex
- contributors: user
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5-codex
- verified_by_agent: codex
- verified_by_agent_model: gpt-5-codex
- attribution_basis: live

## What Is Achieved Now

- Complex numeric polynomial/rational results show hardened evidence for root-slot accounting, residual/backward-error scale, derivative magnitude, Decimal.js revalidation status, and denominator/pole rejection.
- The app still presents these as approximate numeric evidence, not formal proof certificates.

## Manual App Steps

1. Open Equation > Symbolic.
2. Turn Complex On.
3. Enter `x^6+x+1=0` and press Solve.
4. Confirm the result is approximate Complex roots and the details include `Global Complex Polynomial Evidence`, root slots, backward error, and derivative magnitude.
5. Enter `(x^6+x+1)/x=0` and press Solve.
6. Confirm the rational result is pole-aware and preserves `x != 0` evidence.

## Expected Results

- No `NaN`, `undefined`, overflow, or unreadable detail-card text appears.
- The wording says hardened numeric evidence, not a formal proof certificate.
- Real Sturm-certified wording remains absent from these Complex numeric cards.
