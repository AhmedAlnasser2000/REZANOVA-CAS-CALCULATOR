# TRANSCENDENTAL-CERTIFICATE-NEXT-FAMILY-AUDIT0

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

## Scope

Audit only. No runtime behavior, solver route, Display schema, public Calculus strategy, History, OOE, Tauri, persistence, or result shape changed.

This audit chooses the next certificate direction after the live quadratic-exponential certificate plus `erf`/`erfi` answer layer.

## Current Baseline

- Pure `e^(quadratic)` indefinite integrals now have proof-backed non-elementary certificate details.
- Exact-rational and target-free symbolic quadratic exponentials can show `erf`/`erfi` formulas as the main Answer when available.
- The certificate layer is still deliberately narrow: it is not full transcendental Risch and does not certify arbitrary depth-2 towers.

## Candidate 1: Sine And Cosine Integral Forms

Target examples:

- `sin(x)/x`
- `cos(x)/x`
- `sin(a*x+b)/(a*x+b)`
- `cos(a*x+b)/(a*x+b)`

Why useful:

- Common in engineering, signal processing, asymptotics, and differential equations.
- Easy for users to recognize.
- Natural named readback through `Si` and `Ci`.
- The just-completed `SPECIAL-FUNCTION-SI-CI-AUDIT0` already defines the safe first readback and branch conventions.

Prerequisites:

- exact `Si`/`Ci` differentiation
- proof-local trig quotient profiling
- a proof route in a stated field, either native trig field or an exponentialized field with controlled complex constants
- visible domain facts such as `u\ne0`, `a\ne0`, and positive-argument facts for first live `Ci`
- notation-safe copy/history readback

Risk:

- `Ci` branch conventions are easy to misrepresent. The first implementation should be conservative and real-branch explicit.

Verdict:

- Best next live certificate family after the current batch, provided `Si`/`Ci` substrate and proof obligations are implemented first.

## Candidate 2: Exponential Integral And Logarithmic Integral Forms

Target examples:

- `e^x/x`
- `e^(a*x+b)/(c*x+d)`
- `1/ln(x)`
- integration-by-parts forms that reduce to logarithmic integral, such as `ln(ln(x))`

Why useful:

- Frequent enough in engineering and asymptotic analysis.
- Covers a meaningful part of the depth-2/logarithmic gap users notice.

Prerequisites:

- `Ei` and likely `li` readback policy
- exact differentiation for `Ei(u)` and `li(u)` under chosen domain conventions
- log-domain and branch-cut facts
- tower profiler support for log/exponential over rational kernels
- proof-local Liouville/log-derivative obstruction evidence, not only a failed RN search

Risk:

- Branch/domain conventions are more delicate than `erf/erfi` and `Si`.
- `li(x)` and `Ei(ln(x))` equivalences can confuse readback if not explicitly normalized.

Verdict:

- Strong second candidate, but should get a dedicated `EI/LI-AUDIT0` before implementation.

## Candidate 3: Depth-2 Towers

Target examples:

- `e^(e^x)`
- `e^x*ln(x)`
- `ln(ln(x))`
- `e^(sin(x))`

Why useful:

- These are the natural next boundary once users test beyond textbook special-function families.

Prerequisites:

- a real tower-depth profiler, not a route-local detector
- exact differentiation closure for every tower head in the stated field
- proof-local simplification/equality in the tower
- clear distinction among certified non-elementary, named special-function output, and unsupported tower shape
- branch/domain facts for nested logs

Risk:

- Depth-2 widening without proof machinery recreates the same heuristic-family chase that RN closeout deliberately avoided.

Verdict:

- Not the next implementation. Audit/substrate first, then admit only one named family at a time.

## Candidate 4: Fresnel-Style Quadratic Trig Forms

Target examples:

- `sin(x^2)`
- `cos(x^2)`
- `sin(a*x^2+b*x+c)`
- `cos(a*x^2+b*x+c)`

Why useful:

- Common in waves/optics and recognizable as non-elementary.
- Similar educational shape to the `erf/erfi` quadratic exponential family.

Prerequisites:

- named Fresnel function policy or certificate-only result policy
- exact differentiation for the chosen named heads
- quadratic trig tower profile and proof-local obstruction
- branch/readback choices for scaled and shifted quadratics

Verdict:

- Good later certificate family, but lower immediate value than `Si/Ci` because named function readback policy is not yet scoped.

## Recommendation

Next rigorous certificate implementation should be a two-step `Si`/`Ci` path:

1. Add behavior-invisible `Si`/`Ci` special-function substrate: MathJSON heads, exact differentiation, proof-local differentiation, notation-safe copy/readback tests.
2. Add live certificate-backed `sin(u)/u` and conservative `cos(u)/u` readback for affine `u`, preserving non-elementary certificate details.

Do not start broad tower-depth widening yet. The useful tower cases should be admitted through named, proof-backed families (`Si/Ci`, then `Ei/li`, then possibly Fresnel) rather than by claiming general transcendental Risch coverage.

## Required Proof And UX Upgrades Before Live Adoption

- A certificate-family profile that states the differential field and constants.
- A direct exact derivative proof for the special-function answer.
- A Liouville/log-derivative obstruction note in details.
- Visible facts separated from proof obligations.
- Main Answer as named special function when available; certificate detail as proof support.
- Clear controlled stops for branch-sensitive, inexact, non-affine, and nested-tower inputs.

## Deferrals

- Full transcendental Risch remains out of scope.
- General depth-2 tower proving is deferred.
- Complex branch cuts for `Ci`, `Ei`, `li`, and future Fresnel families are deferred until each family has its own branch/readback policy.
- Limits/numeric definite integration are useful downstream UX, but not prerequisites for this next indefinite-certificate family.
