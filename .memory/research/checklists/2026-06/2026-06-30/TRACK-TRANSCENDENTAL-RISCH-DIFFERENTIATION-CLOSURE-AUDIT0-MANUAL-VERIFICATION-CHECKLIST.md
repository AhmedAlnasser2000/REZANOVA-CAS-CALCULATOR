# TRACK-TRANSCENDENTAL-RISCH-DIFFERENTIATION-CLOSURE-AUDIT0 Manual Verification Checklist

Date: 2026-06-30

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

- The audit confirms first certificate work needs proof-local differentiation hardening, not a broad differentiator rewrite.
- Certificate proof must deny Compute Engine fallback and reject inexact/unsupported closure.
- Runtime behavior is unchanged.

## Manual App Steps

Use Calculus -> Derivatives for derivative checks and Calculus -> Integrals -> Indefinite for integration checks.

1. Differentiate `e^(x^2)` with respect to `x`.
2. Differentiate `e^(-x^2)` with respect to `x`.
3. Differentiate `e^(a*x^2+b*x+c)` with respect to `x`.
4. Differentiate `ln(ln(x))` with respect to `x`.
5. Differentiate `sin(x)/x` with respect to `x`.
6. Try integrating `e^(x^2)`.

## Expected Results

1. Derivative is structurally `2*x*e^(x^2)` or equivalent.
2. Derivative is structurally `-2*x*e^(-x^2)` or equivalent.
3. Derivative is structurally `(2*a*x+b)*e^(a*x^2+b*x+c)` or equivalent.
4. Derivative is structurally `1/(x*ln(x))` or equivalent.
5. Derivative uses quotient/product rules exactly.
6. Integration is not certified yet; it should remain controlled unsupported until the certificate substrate and live certificate milestone exist.
