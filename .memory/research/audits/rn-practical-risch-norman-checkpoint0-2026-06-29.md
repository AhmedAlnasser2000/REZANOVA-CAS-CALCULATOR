# RN-PRACTICAL-RISCH-NORMAN-CHECKPOINT0

Date: 2026-06-29

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

Audit only. This checkpoint makes no runtime, solver, Display, History, OOE, Tauri, persistence, public Calculus schema, or public strategy-label changes.

The goal is to record the state after the shared-algebra and LRT leap before planning the next Risch-Norman layer.

## Current RN/LRT Coverage

The live RN layer is now an internal bounded fallback behind existing public strategy labels.

Supported internal substrates:

- domain-neutral coefficient arithmetic for exact-rational plus target-free symbolic MathJSON coefficients
- bounded symbolic polynomials over that coefficient domain
- symbolic derivative, exact division, squarefree readiness, Sylvester resultant construction, and determinant resultants
- named algebraic-root descriptors using `alpha_i` definitions, with no raw `RootOf` in primary answers
- RN coefficient wrappers, linear solver, ansatz solvers, Hermite-style rational correction, LRT logarithmic part, and bounded tower-basis planning

Supported live RN families:

- polynomial times affine `e^(a*v+b)` and positive-base `q^(a*v+b)`
- polynomial times affine `sin(a*v+b)` and `cos(a*v+b)`
- polynomial times `e^(a*v+b)sin(c*v+d)` and `e^(a*v+b)cos(c*v+d)`
- affine-log correction for `P(v)ln(a*v+b)` and `P(v)log(a*v+b)`
- affine Laurent-log correction for matching `(a*v+b)^k` denominators
- symbolic two-factor affine trig product-to-sum cases
- symbolic log-derivative `k*D'(v)/D(v)` for bounded denominators
- symbolic Hermite rational corrections for exact derivatives of `P(v)/Q(v)^m` plus residual log-derivative cases
- symbolic quadratic rational power-one casewise branches and positive repeated powers `2` and `3`
- bounded LRT rational adoption for proper residuals over squarefree exact cubic denominators
- all-or-nothing top-level linear-combination wrapping when every term is already supported

## LRT Coverage

The current LRT implementation is intentionally narrow:

- It constructs `R(lambda)=Res_v(Q,P-lambda*Q')`.
- It represents roots of `R(lambda)` as named `alpha_i` descriptors.
- It emits formal `S_i(v)=gcd(Q,P-alpha_i*Q')` definitions.
- It integrates supported residuals as sums of `alpha_i*ln|S_i(v)|`.
- Live dispatch adoption is limited to proper residuals over squarefree exact cubic denominators.

The LRT substrate is useful and real, but it is not yet the full logarithmic completion layer for arbitrary rational functions. Symbolic denominator coefficients stop before algebraic coefficient reduction, and degree `4+` live adoption remains deferred even though pieces of the primitive resultant stack are already present.

## Caps And Stop Lines

Current important caps:

- RN polynomial/by-parts degree caps remain family-specific; many polynomial-coefficient transcendental families use degree `<=6`.
- Shared symbolic polynomial/resultant infrastructure has degree caps and Sylvester/resultant dimension stops.
- Hermite rational correction is lifted to denominator degree `<=8` and denominator powers `<=3`.
- LRT descriptor degree cap is `<=6`, but live LRT rational adoption currently uses exact cubic denominators only.
- Symbolic quadratic repeated powers are live only for powers `2` and `3` under the positive generic branch.

Stop lines:

- selected-variable-dependent coefficient fields
- decimals and inexact coefficients
- branch-sensitive carriers such as `Abs`
- nested towers such as `e^(sin(x))`, `ln(ln(x))`, and `e^x*ln(x)` outside planned future tower work
- broad symbolic factorization or partial fractions beyond the approved slices
- algebraic extensions beyond named-root proof descriptors
- public RN/LRT strategy labels

## Descriptor Policy

Named-root descriptors are internal proof/readback artifacts for integration.

Current policy:

- Primary answers may use `alpha_i` terms only when definitions are supplied in exact-supplement/detail output.
- Main answers should not expose raw `RootOf`.
- Equation has no consumer for these descriptors.
- If Equation later needs algebraic roots, it must use shared primitive descriptors only through Equation-owned routes and readback, not RN/LRT steps.

## Position From Practical Risch-Norman

For Calcwiz's current scoped target-free symbolic coefficient work, this is roughly `70-80%` of a practical bounded Risch-Norman heuristic.

That estimate is about useful Calcwiz coverage, not a literature claim. The layer now handles many standard rational, logarithmic, exponential, sine/cosine, mixed exp-trig, symbolic quadratic, Hermite-correction, and first LRT residual cases. It still does not implement full/general Risch-Norman search.

## Remaining General-RN Gaps

The meaningful gaps are now larger algorithmic layers, not small rule additions:

- nested transcendental towers such as `e^(e^x)`, `ln(ln(x))`, `e^x*ln(x)`, and related depth-2 extensions
- algebraic extensions beyond named roots used as logarithmic proof descriptors
- robust algebraic-log trace/readback for higher-degree LRT outputs
- broad degeneracy branching for symbolic pivots and discriminants
- symbolic denominator coefficient LRT reduction
- wider Hermite plus LRT completion over denominator degrees beyond the current live cubic LRT slice
- formal non-existence certificates, which belong to a later Risch/transcendental-Risch track rather than RN heuristic adoption

## Recommended Next Layer

Do not rush directly into "full RN". Recommended sequencing:

1. Nested tower audit/substrate:
   - classify depth-2 exp/log/trig towers and identify which are RN-friendly versus formal Risch territory.

2. Algebraic-log descriptor/readback hardening:
   - make named-root definitions, trace-style terms, and copy/readback resilient for larger LRT outputs before widening live adoption.

3. LRT symbolic denominator coefficient readiness:
   - decide whether symbolic denominator coefficients need algebraic coefficient arithmetic or a narrower exact/specialized slice.

4. Degeneracy branch policy:
   - add planned special branches for common zero pivots/discriminants rather than using generic `Valid When` facts forever.

5. Non-existence certificate audit:
   - plan separately from RN heuristic work; this is where full Risch-style value starts.

## Closeout Statement

The shared algebra + LRT leap is complete for its approved scope. Calcwiz now has the primitives and internal RN method planner needed to keep widening responsibly, but the next gains require deliberate larger layers: nested towers, algebraic extensions, degeneracy branching, algebraic-log readback, and eventually non-existence certificates.
