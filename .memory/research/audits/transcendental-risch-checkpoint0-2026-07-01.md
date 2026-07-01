# TRANSCENDENTAL-RISCH-CHECKPOINT0

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

This is a docs/memory-only checkpoint. It records where Calcwiz stands after the depth-2 certificate and quotient-power recurrence batch, and it sets the next high-leverage direction toward formal transcendental Risch.

No runtime behavior, Display schema, Calculus schema, Equation route, OOE, History, Tauri, or persistence behavior changed in this checkpoint.

## Current Live Integration Position

Calcwiz now has three distinct integration layers that should stay conceptually separate:

1. **Rubi/Tier-I and textbook elementary integration**
   - Tier-I exact-rational and target-free symbolic elementary families are broad.
   - Polynomial expansion, affine powers, trig, exponentials, rational partial fractions, symbolic coefficient catchup, by-parts cascades, and many u-substitution cases are live.
   - Some textbook-by-parts/log-substitution examples remain intentionally deferred to the Stewart/Thomas benchmark sweep rather than being handled one at a time inside formal Risch infrastructure.

2. **Bounded Risch-Norman/Rothstein-Lazard-Rioboo-Trager search**
   - RN owns proof-based elementary searches for symbolic polynomial-times-exp/sin/cos, exp-sincos, affine logs, symbolic log derivatives, Hermite corrections, symbolic quadratic rational slices, and bounded LRT rational log parts.
   - Shared algebra primitives now exist for coefficient domains, symbolic polynomial/resultant work, and named algebraic-root descriptors.
   - This remains bounded RN, not a complete general Risch-Norman implementation.

3. **Transcendental certificate and special-function readback**
   - Live named special-function answers now include:
     - `e^(a*v^2+b*v+c)` -> `erf/erfi` with exact-rational and symbolic-leading-coefficient casewise branches.
     - `sin(u)/u` and `cos(u)/u` -> `Si/Ci` for affine `u`.
     - `e^u/u` and `1/ln(u)` -> `Ei/li` for affine `u`.
     - `e^(e^u)`, `sin(e^u)`, `cos(e^u)` -> `Ei(e^u)`, `Si(e^u)`, `Ci(e^u)` for affine `u`.
     - `sin(q(v))` and `cos(q(v))` -> `FresnelS/FresnelC` for exact-rational quadratic `q`.
     - `sin(u)/u^n`, `cos(u)/u^n`, and `e^u/u^n` -> bounded `Si/Ci/Ei` recurrence answers for affine `u`, powers `2..6`.
   - Certificate details now distinguish input facts, branch facts, proof obligations, special-function readback, and non-elementarity evidence.

## Current Formal-Risch Infrastructure

The repo has real proof infrastructure, but it is not yet a complete formal Risch decision procedure:

- `transcendental-field-tower.ts` profiles selected-variable towers, extension heads, coefficient scope, and depth/readiness.
- `transcendental-constant-field.ts` normalizes target-free constants and proof facts.
- `transcendental-certificate/proof-diff.ts` provides proof-local exact differentiation for supported heads.
- `transcendental-rde.ts` represents and solves the first bounded first-order Risch differential equations needed by current certificates.
- `transcendental-liouville.ts` builds Liouville proof/decomposition evidence.
- `transcendental-reduced-equation.ts` turns tower profiles and Liouville evidence into reduced-equation obligations and stops.
- Special-function certificate producers are live for selected named families.

This means Calcwiz has moved beyond route-local family tricks. Still, the current system is family-admitted and cap-bounded. It does not yet normalize arbitrary differential-field towers, solve general RDEs, or prove non-elementarity for arbitrary elementary extensions.

## What This Is Not Yet

Calcwiz is not yet full unrestricted formal transcendental Risch because these pieces are missing or only partial:

- canonical tower normal forms that can be used as algebraic objects, not only profiled as shapes
- full exact derivation closure over arbitrary nested elementary towers
- parametric RDE solving over the active coefficient field
- primitive-extension Risch solving for general log/primitive towers
- exponential-extension Risch solving beyond admitted families
- Liouville decomposition as a live solver driver rather than mostly proof/readiness evidence
- broader Rothstein/Lazard-Rioboo-Trager logarithmic completion over symbolic coefficient fields
- algebraic constants/traces and later algebraic function extensions
- systematic degeneracy branching for vanished pivots, repeated resultants, discriminants, and special-parameter branches
- general depth-2 solving and depth-3+ tower recursion
- complex branch constants and full complex-domain readback
- formal certificates outside the admitted family list

## Practical Position

For student and engineering workflows, integration is now strong: the live layer covers many textbook elementary families, rational/RN families, and named special-function families that ordinary calculus books often do not solve symbolically.

For formal transcendental Risch, a fair current estimate is:

- practical named-family and bounded RN integration: high
- theorem-backed certificate infrastructure: real but incomplete
- unrestricted formal transcendental Risch: early-to-middle, roughly `35-45%` of the machinery, depending on whether algebraic extensions are counted as part of the target

The next leap should therefore not be more isolated special functions. It should be method-level Risch structure: tower normal forms, stronger RDE solving, Liouville-as-driver, and LRT/log-part lifting.

## Recommended Next 12 Major Milestones

1. `TRANSCENDENTAL-TOWER-NORMAL-FORM1`
   - Build canonical differential-field tower objects: base field, ordered generators, derivative rules, extension kind, facts, and selected-variable scope.
   - Convert current profiler evidence into reusable normal-form inputs.

2. `TRANSCENDENTAL-DERIVATION-CLOSURE2`
   - Extend proof-local differentiation over tower normal forms.
   - Keep Compute Engine and numeric evidence denied for proof use.

3. `TRANSCENDENTAL-PARAMETRIC-RDE1`
   - Solve bounded parametric RDEs by coefficient comparison over the tower coefficient field.
   - This is the biggest prerequisite for replacing family-only proof routes with method routes.

4. `TRANSCENDENTAL-PRIMITIVE-EXTENSION-RISCH1`
   - Implement the primitive-extension side of Risch for towers where `theta'` lies in the base field, including log/primitive tower cases.
   - This should serve nested log families and some textbook log-substitution forms later.

5. `TRANSCENDENTAL-EXPONENTIAL-EXTENSION-RISCH1`
   - Implement the exponential-extension side for towers where `theta'/theta` lies in the base field.
   - This generalizes current admitted exp-quadratic and exp-depth2 slices.

6. `TRANSCENDENTAL-LIOUVILLE-SOLVER1`
   - Turn Liouville objects into a solver driver: rational part, log-derivative residuals, RDE obligations, special-function answers, or certificate stops.

7. `TRANSCENDENTAL-RATIONAL-LOG-PART-LRT-LIFT1`
   - Lift LRT logarithmic completion beyond the current bounded exact-denominator cases.
   - Keep LRT integration-owned while sharing only primitive algebra.

8. `TRANSCENDENTAL-ALGEBRAIC-CONSTANTS-AND-TRACE1`
   - Add algebraic constant descriptors, traces, and readback needed by LRT/logarithmic parts.
   - Do not yet implement full algebraic function-field Risch.

9. `TRANSCENDENTAL-DEGENERACY-BRANCH-SOLVER1`
   - Add controlled branch solving for zero/nonzero pivots, vanished slopes, repeated resultants, discriminants, and generic-formula special cases.

10. `TRANSCENDENTAL-DEPTH2-GENERALIZATION1`
    - Move beyond admitted `e^(e^u)`, `sin(e^u)`, and `cos(e^u)` cases by using tower normal form plus RDE/Liouville evidence.
    - Keep depth-3 stopped unless the normal-form path makes a family cheap and proof-clean.

11. `TRANSCENDENTAL-CERTIFICATE-ORCHESTRATOR1`
    - Add one internal decision orchestrator that chooses elementary solve, named special-function answer, non-elementary certificate, or controlled unsupported stop from the same tower proof record.

12. `TRANSCENDENTAL-RISCH-PRACTICAL-FORMAL-CHECKPOINT0`
    - Audit the post-push position, update manual benchmark cases, and decide whether to attack depth-3, algebraic extensions, or textbook benchmark catchup next.

## Suggested Manual Verification Set

Use these as a quick app-level smoke set for the current checkpoint:

- `e^(-x^2)` -> `sqrt(pi)/2 * erf(x)`
- `e^(a*x^2+b*x+c)` -> casewise `erf/erfi`, with `a != 0`
- `sin(x)/x` -> `Si(x)`
- `cos(x)/x` -> casewise `Ci(x)` / `Ci(-x)`
- `e^x/x` -> casewise `Ei(x)`
- `1/ln(x)` -> casewise `li(x)`
- `e^(e^x)` -> `Ei(e^x)`
- `sin(e^x)` -> `Si(e^x)`
- `cos(e^x)` -> `Ci(e^x)`
- `sin(x^2)` -> `FresnelS` form
- `cos(x^2)` -> `FresnelC` form
- `sin(x)/x^2` -> recurrence answer involving `Ci` and `sin(x)/x`
- `e^x/x^2` -> recurrence answer involving `Ei` and `e^x/x`
- `sin(x)/x^7` -> controlled unsupported over-cap stop
- `e^(sin(x))` -> controlled unsupported general depth-2 stop

## Checkpoint Decision

The next formal-Risch push should be method-level infrastructure, not a wider list of special-function family patches. Textbook families remain valuable, but they should be benchmark-driven once Stewart/Thomas material is supplied.
