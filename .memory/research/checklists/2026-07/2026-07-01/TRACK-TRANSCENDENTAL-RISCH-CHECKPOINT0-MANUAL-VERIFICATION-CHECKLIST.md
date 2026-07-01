# TRANSCENDENTAL-RISCH-CHECKPOINT0 Manual Verification Checklist

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

- Calcwiz has live named special-function integration for exp-quadratic `erf/erfi`, affine `Si/Ci`, affine `Ei/li`, exact-rational quadratic-trig `FresnelS/FresnelC`, and affine quotient-power `Si/Ci/Ei` recurrences.
- Calcwiz has bounded RN/Rothstein-Lazard-Rioboo-Trager support for several elementary symbolic families and rational log parts.
- Calcwiz has behavior-invisible formal-Risch infrastructure for tower profiling, proof-local differentiation, constant/fact handling, RDE proof objects, Liouville decomposition, and reduced-equation evidence.
- Calcwiz is not yet unrestricted formal transcendental Risch.

## Manual App Steps

In Calculus -> Integrals -> Indefinite Integral, test:

1. `e^(-x^2)`
2. `e^(a*x^2+b*x+c)`
3. `sin(x)/x`
4. `cos(x)/x`
5. `e^x/x`
6. `1/ln(x)`
7. `e^(e^x)`
8. `sin(e^x)`
9. `cos(e^x)`
10. `sin(x^2)`
11. `cos(x^2)`
12. `sin(x)/x^2`
13. `e^x/x^2`
14. `sin(x)/x^7`
15. `e^(sin(x))`

## Expected Results

- `e^(-x^2)` returns an `erf` answer.
- `e^(a*x^2+b*x+c)` returns casewise `erf/erfi` rows with `a\ne0`.
- `sin(x)/x` returns `Si(x)`.
- `cos(x)/x` returns casewise `Ci(x)` and `Ci(-x)`.
- `e^x/x` returns casewise `Ei(x)`.
- `1/ln(x)` returns casewise `li(x)`.
- `e^(e^x)`, `sin(e^x)`, and `cos(e^x)` return `Ei(e^x)`, `Si(e^x)`, and `Ci(e^x)`.
- `sin(x^2)` and `cos(x^2)` return Fresnel answers.
- `sin(x)/x^2` and `e^x/x^2` return recurrence answers using `Ci` or `Ei`.
- `sin(x)/x^7` and `e^(sin(x))` remain controlled unsupported/future-scope stops.
