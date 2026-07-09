# TRACK-TRANSCENDENTAL-RISCH-CERTIFICATE-AUDIT0 Manual Verification Checklist

Date: 2026-06-30

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

- The next integration track is scoped as certificate-first rather than unrestricted RN completion.
- The audit lists prerequisites and upgrades for theorem-backed non-elementary output.
- No runtime certificate behavior is live yet.

## Manual App Steps

Use Calculus -> Integrals -> Indefinite.

1. Enter `e^(x^2)` and evaluate.
2. Enter `e^(-x^2)` and evaluate.
3. Enter `sin(x)/x` and evaluate.
4. Enter `ln(ln(x))` and evaluate.
5. Enter `x^2*e^(a*x+b)*sin(c*x+d)` and evaluate.
6. Enter `1/(x^3+x+1)` and evaluate.

## Expected Results

1. `e^(x^2)` is not certified yet; it should return the current controlled unsupported behavior rather than a false elementary answer.
2. `e^(-x^2)` is not certified yet; it should return the current controlled unsupported behavior rather than a false elementary answer.
3. `sin(x)/x` is not certified yet; it should return the current controlled unsupported behavior until a sine-integral certificate slice exists.
4. `ln(ln(x))` remains a depth-2/nested-log case and should not be claimed by RN.
5. Existing RN mixed exp-sincos support should still succeed through the public `integration-by-parts` label.
6. Existing bounded LRT cubic rational support should still succeed through the public `partial-fractions` label.
