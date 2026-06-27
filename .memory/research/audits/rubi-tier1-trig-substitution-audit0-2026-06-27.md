# RUBI-TIER1-TRIG-SUBSTITUTION-AUDIT0

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

Audit readiness for the three standard trig-substitution radical families:

- `sqrt(a^2-u^2)`
- `sqrt(a^2+u^2)`
- `sqrt(u^2-a^2)`

where `u=m*x+n` and all scalar coefficients are exact-rational for the first implementation pass. No runtime behavior changes are approved by this audit.

## Current Readiness

- Exact-rational affine parsing exists in multiple integration helpers, but needs one shared integration-local helper before trig-substitution runtime work to avoid another route-local parser.
- Exact square/root scalar handling exists in rational and radical verifier helpers, but should be centralized or re-exported before adding more radical routes.
- Differentiation already supports product rule, chain rule, `Sqrt`, `Ln`, `Abs`, `Arcsin`, and `Arctan`; it does not yet support safe `Arcsec` readback, and `Arcsec` has unavoidable absolute-value/domain conditions.
- Verifier support for scaled `arcsin` reciprocal-square-root forms now exists, but trig-substitution formulas also need exact proof for `u*sqrt(...)` plus logarithmic radical expressions.
- The classifier can identify radical/algebraic forms, but there is no internal `trig-substitution` route family yet.

## Family Requirements

### `sqrt(a^2-u^2)`

- First safe runtime slice: exact-rational positive `a^2`, affine `u=m*x+n`, integrand exactly `sqrt(a^2-u^2)`.
- Expected antiderivative:
  - `(u*sqrt(a^2-u^2))/(2m) + (a^2/(2m))*arcsin(u/a)`
- Required facts:
  - `a^2>0`
  - real-domain prerequisite `a^2-u^2>=0`
  - principal square-root nonnegative
- Exact-backcheck risks:
  - product derivative of `u*sqrt(a^2-u^2)`
  - scaled `arcsin(u/a)` proof
  - cancellation between radical product and arcsin derivative terms

### `sqrt(a^2+u^2)`

- First safe runtime slice: exact-rational positive `a^2`, affine `u=m*x+n`, integrand exactly `sqrt(a^2+u^2)`.
- Expected antiderivative:
  - `(u*sqrt(a^2+u^2))/(2m) + (a^2/(2m))*ln|u+sqrt(a^2+u^2)|`
- Required facts:
  - `a^2>0`
  - `u+sqrt(a^2+u^2)` is positive for real `u`, so readback could eventually avoid an absolute value, but the current display/verifier should keep the conservative log form until facts are explicit.
- Exact-backcheck risks:
  - logarithmic radical derivative simplification
  - avoiding accidental numeric-confidence adoption

### `sqrt(u^2-a^2)`

- First safe runtime slice should wait until branch/domain facts are stronger.
- Expected antiderivative:
  - `(u*sqrt(u^2-a^2))/(2m) - (a^2/(2m))*ln|u+sqrt(u^2-a^2)|`
- Required facts:
  - `a^2>0`
  - real-domain prerequisite `u^2-a^2>=0`
  - branch split or condition for `u>=a` versus `u<=-a` if an `arcsec` readback is considered
- Exact-backcheck risks:
  - `arcsec` derivative requires `Abs(u)` or branch assumptions
  - logarithmic form is safer than `arcsec` until branch readback exists

## Route And Strategy Policy

- Do not add a public `CalculusIntegrationStrategy`.
- Recommended internal route handling:
  - classify these as `algebraic-radical` with an internal radical/trig-substitution branch tried before generic direct-rule failure.
  - visible strategy should remain `u-substitution` or `direct-rule` only after user/product review; the audit does not lock the visible label.
- Route precedence should stay below existing exact direct inverse-trig/rational/substitution overlaps:
  - inverse-trig and derivative-present substitution still win when the integrand is reciprocal or derivative-present.
  - partial fractions should continue to own rationalized forms.
  - branch-sensitive `Abs` remains a controlled stop.

## Readback Requirements

- Result readback must include radical-domain conditions before broad runtime adoption.
- Log forms must use existing structured `Answer` rendering without new public result-schema fields.
- If future output uses `arcsec`, it must carry explicit branch/domain facts or use an equivalent log form instead.

## Recommended First Runtime Milestone

`RUBI-TIER1-TRIG-SUBSTITUTION-SQRT-A2-MINUS-U2-1`

- Implement only `sqrt(a^2-(m*x+n)^2)` for exact-rational positive `a^2` and exact-rational affine `u`.
- Adopt only with `verified-exact` backcheck.
- Add explicit controlled stops for `sqrt(u^2-a^2)`, symbolic parameters, non-affine `u`, `Abs`, and non-square/completed-square variants not yet parsed.

## Stop Line

Do not implement general Euler substitutions or pseudo-elliptic radical heuristics in Tier I. Those belong after this elementary trig-substitution slice and after branch/domain facts are visibly reliable.
