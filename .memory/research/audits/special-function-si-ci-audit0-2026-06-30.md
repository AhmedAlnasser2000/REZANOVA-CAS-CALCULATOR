# SPECIAL-FUNCTION-SI-CI-AUDIT0

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

## Scope

Audit only. No runtime behavior, source code, Display schema, public Calculus strategy, History, OOE, Tauri, persistence, or result shape changed.

This audit narrows the future `Si`/`Ci` special-function layer after the live `erf`/`erfi` quadratic-exponential readback.

## Candidate Families

First live family should be derivative-present affine sine/cosine quotient forms:

- `sin(x)/x`
- `cos(x)/x`
- `sin(a*x+b)/(a*x+b)`
- `cos(a*x+b)/(a*x+b)`
- scalar multiples such as `k*sin(a*x+b)/(a*x+b)`
- derivative-present normalized variants such as `a*sin(a*x+b)/(a*x+b)` returning `Si(a*x+b)`

The implementation should prefer the structural form `u' * sin(u)/u` or `u' * cos(u)/u`. If the derivative factor is not present, it may still support exact affine `u=a*x+b` by dividing by the nonzero slope `a`, but it must carry `a\ne0`.

## Readback Convention

- Main Answer should use `\operatorname{Si}(u)` and `\operatorname{Ci}(u)` in rendered/LaTeX notation.
- Plain text should use `Si(u)` and `Ci(u)`.
- The non-elementary certificate remains in details: these are named special-function antiderivatives, not elementary antiderivatives.
- Definitions belong in collapsed detail cards, not in the main Answer.
- Copy Result must preserve MathLive-safe function names and not degrade to ASCII approximation unless plain-text notation is active.

## Differentiation Prerequisites

Before live adoption, exact differentiation must support:

- `d/dx Si(u) = sin(u) * u' / u`
- `d/dx Ci(u) = cos(u) * u' / u`

These rules must be direct exact rules in the symbolic/proof-local differentiator path. Compute Engine fallback or numeric-confidence verification is not acceptable for adopting special-function answers.

## Domain And Branch Policy

`Si` is the safer first live target:

- `Si` is entire in the complex setting, but the input quotient `sin(u)/u` has an explicit denominator.
- For the current real Calculus surface, still surface the input-domain fact `u\ne0` unless a later simplifier intentionally recognizes and documents the removable singularity.

`Ci` is branch-sensitive and must start conservatively:

- Use the real principal convention with visible fact `u>0` for the first live `Ci` branch.
- Negative-real and complex `Ci` conventions are deferred.
- Do not silently use `ln|u|`-style real readback as if it were the complex principal `Ci`.

Both families should stop cleanly on:

- non-affine `u`
- selected-variable-dependent coefficient expressions outside `u`
- decimals/inexact coefficients
- branch-sensitive carriers such as `Abs`
- products such as `x*sin(x)/x` that simplify only after broad cancellation, unless a prior simplifier proves the reduced form exactly

## Certificate Policy

The certificate statement should remain separate from the special-function formula:

- `sin(x)/x` and `cos(x)/x` should eventually show a usable `Si`/`Ci` formula in the main Answer.
- Details should say that no elementary antiderivative exists in the stated elementary field.
- A generic unsupported message is not enough once the certificate route is in scope.

## Implementation Prerequisites

1. Add behavior-invisible `Si`/`Ci` MathJSON/readback heads.
2. Add exact differentiation and proof-local differentiation rules.
3. Add a narrow affine quotient recognizer.
4. Add branch/domain facts, especially `u\ne0`, `a\ne0`, and the conservative `u>0` fact for `Ci`.
5. Add Copy Result and History replay tests for rendered/LaTeX/plain-text notation.

## Deferrals

- `Ei`, logarithmic integral `li`, Fresnel functions, inverse special functions, and broad special-function simplification remain out of this slice.
- Complex `Ci` branch cuts and negative-real `Ci` variants need a separate branch/readback policy before live adoption.
- Sine/cosine quotient certificates over non-affine arguments, nested towers, and parameter-heavy branch case explosions remain deferred.
