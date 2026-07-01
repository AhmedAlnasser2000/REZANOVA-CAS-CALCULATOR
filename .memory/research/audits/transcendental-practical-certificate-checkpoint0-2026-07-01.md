# TRANSCENDENTAL-PRACTICAL-CERTIFICATE-CHECKPOINT0

Date: 2026-07-01

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5-codex
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5-codex
- verified_by_agent: codex
- verified_by_agent_model: gpt-5-codex
- attribution_basis: live

## Scope

Audit only. This checkpoint makes no runtime behavior, solver route, Display schema, History, OOE, Tauri, persistence, public Calculus schema, or public strategy-label changes.

The goal is to record what the depth-2 transcendental certificate plus RN leap now covers, and where formal transcendental Risch remains intentionally deferred.

## Live Certificate And Special-Function Coverage

The certificate layer now has useful named-answer coverage for the first practical non-elementary families:

- Quadratic exponential integrals:
  - `e^(a*v^2+b*v+c)` routes through the exp-quadratic certificate family after elementary routes miss.
  - Exact-rational cases produce `erf` or `erfi` main answers.
  - Target-free symbolic leading coefficient cases produce real casewise `erf`/`erfi` rows for `a<0` and `a>0`, while affine exponentials remain elementary-owned.
- Sine and cosine integral affine quotients:
  - `sin(u)/u` and derivative-present scalar variants produce `Si` answers for affine `u`.
  - `cos(u)/u` produces real-domain `Ci` casewise rows for `u>0` and `u<0`, with the zero argument excluded.
- Exponential and logarithmic integral affine quotients:
  - `e^u/u` produces real-domain `Ei` rows for `u>0` and `u<0`.
  - `1/ln(u)` produces real-domain `li` rows for `u>1` and `0<u<1`, with the singular branch excluded.
- Fresnel substrate:
  - `FresnelS(u)` and `FresnelC(u)` have exact differentiation and proof-local differentiation support.
  - Live integration for `sin(x^2)` and `cos(x^2)` remains deferred until readback, scaling normalization, and branch policy are explicit.

All live certificate-backed special-function answers preserve proof details rather than presenting special functions as elementary antiderivatives.

## RN Depth-2 Elementary Coverage

RN now consumes the depth-2 tower substrate for a narrow elementary substitution slice:

- `e^x e^(e^x) -> e^(e^x)`
- `cos(x)e^(sin(x)) -> e^(sin(x))`
- `e^x/(1+e^x) -> ln(1+e^x)`
- `1/(x ln(x)) -> ln|ln(x)|`

These remain public `u-substitution` results. There is still no public `risch`, `risch-norman`, or `LRT` strategy label.

## Practical Position

For the student/engineer-facing integration scope, this is a meaningful practical certificate layer:

- Common special-function antiderivatives now appear as usable main answers.
- The app distinguishes a theorem-backed non-elementary certificate from a failed heuristic search.
- Elementary depth-2 substitutions that users naturally try are handled before certificate fallback.
- The result remains bounded and readable rather than claiming full formal Risch coverage.

This is not full transcendental Risch. It is a practical, scoped certificate system over selected families with explicit stops.

## Remaining Formal-Risch Gaps

The remaining gaps are large theorem/field layers, not small rule additions:

- General depth-2 towers beyond the admitted affine quotient and derivative-present substitution families.
- Depth-3 and higher towers such as nested exponential/logarithmic towers with multiple dependent extensions.
- Risch differential equations over general transcendental towers.
- Algebraic extensions beyond the existing RN/LRT named-root descriptor layer.
- Complex branch cuts and branch constants for `Ci`, `Ei`, `li`, Fresnel, and future special functions.
- Broad proof-field solving and degeneracy branching for symbolic parameters.
- Formal non-existence certificates outside the current exp-quadratic and named special-function families.

## Next Recommended Layer

Do not jump straight to depth 3.

Recommended follow-up order:

1. Make Fresnel live only after scaling/readback and branch facts are scoped for `sin(quadratic)` and `cos(quadratic)`.
2. Add targeted certificate families such as `sin(x)/x^n`, `cos(x)/x^n`, or controlled logarithmic variants only when the proof obligation is explicit.
3. Audit depth-2 tower classes before widening. Separate RN-friendly elementary substitutions from true non-elementary certificate families.
4. Keep formal transcendental Risch as a later infrastructure layer with its own differential-field equation solver, branch policy, and proof readback.

## Closeout Statement

The approved depth-2 certificate/RN leap is complete for its scoped practical target. Calcwiz now has live `erf/erfi`, `Si/Ci`, `Ei/li`, and elementary RN depth-2 substitution coverage, plus proof-safe Fresnel substrate. Further work should widen one theorem-backed family at a time rather than presenting the current bounded system as full formal transcendental Risch.
