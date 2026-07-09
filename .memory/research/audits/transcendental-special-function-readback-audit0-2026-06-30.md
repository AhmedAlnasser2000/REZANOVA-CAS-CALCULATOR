# TRANSCENDENTAL-SPECIAL-FUNCTION-READBACK-AUDIT0

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live

## Scope

This audit records future requirements for special-function readback after the first transcendental Risch certificate path. It is docs/memory only: no runtime behavior, solver route, Display schema, public Calculus strategy, History, OOE, Tauri, or persistence shape changed.

## Current Baseline

- `TRANSCENDENTAL-RISCH-EXP-QUADRATIC-CERTIFICATE1` now reports theorem-backed non-elementarity for pure `e^(quadratic)` indefinite integrals in the stated elementary field.
- The live certificate deliberately does not output `erf`, `erfi`, or any other special function.
- The certificate result is a successful result card with proof details, not a failed integration search and not a numeric-confidence approximation.

## Readback Policy For Future Special Functions

- Special-function readback should be an optional expression layer on top of the certificate, not a replacement for the non-elementary fact.
- The answer must say clearly that the result is non-elementary but expressible with a named special function.
- Main answer readback should use stable function heads such as `erf`, `erfi`, `Si`, `Ci`, and possibly `Ei`; avoid raw Compute Engine strings or unsupported heads leaking through Display.
- Copy Result must preserve MathLive-safe LaTeX for the chosen notation mode.
- Special-function definitions belong in collapsed details or a dedicated proof/readback section, not as noisy inline prose in the main answer.

## Differentiation Prerequisites

Before any special-function antiderivative is live, proof/backcheck differentiation needs direct exact rules for:

- `erf(u)`: derivative proportional to `e^{-u^2} u'`.
- `erfi(u)`: derivative proportional to `e^{u^2} u'`.
- `Si(u)`: derivative `sin(u) u'/u`.
- `Ci(u)`: derivative `cos(u) u'/u` under the chosen real-domain convention.
- likely `Ei(u)` for `e^u/u` families, if that family is admitted.

These rules must stay in the symbolic differentiator or a proof-local special-function derivative module, not in Compute Engine fallback. Numeric-confidence verification is not enough for special-function result adoption.

## Facts And Branch Requirements

- Quadratic exponential readback requires completing the square and facts about the quadratic leading coefficient.
- Exact-rational leading coefficients can choose `erf` for negative square exponent shape and `erfi` for positive square exponent shape.
- Target-free symbolic leading coefficients require visible sign facts before choosing `erf` versus `erfi`; otherwise the result should remain the certificate-only case or become an explicit casewise special-function readback later.
- `Ci`, `Ei`, and logarithmic/singular special functions require branch/domain policy before live adoption.
- No Equation-owned branch/domain wrappers should be imported into Calculus. Shared pieces, if needed, must be domain-neutral facts or algebra helpers.

## First Safe Future Slices

1. `SPECIAL-FUNCTION-ERF-ERFI-EXP-QUADRATIC1`
   - Add direct readback for exact-rational `e^(a*x^2+b*x+c)` after certificate proof, with `a<0` using `erf` and `a>0` using `erfi`.
   - Keep symbolic-sign cases certificate-only unless explicit casewise facts are implemented.

2. `SPECIAL-FUNCTION-SI-CI-BASIC1`
   - Add named readback for `sin(x)/x` and selected affine/scaled variants only after direct derivative rules and branch conventions are locked.

3. `SPECIAL-FUNCTION-EI-AUDIT0`
   - Audit `Ei` separately because branch cuts and real-domain conventions are easier to get wrong than the `erf/erfi` quadratic exponential family.

## Deferrals

- Broad special-function CAS output is deferred.
- Full special-function simplification, identities, complex branches, parameter-sign case explosion, inverse special functions, and automatic conversion from certificates to special functions are deferred.
- Transcendental Risch certificates remain useful even when special-function readback exists: they explain why an elementary antiderivative is impossible.
