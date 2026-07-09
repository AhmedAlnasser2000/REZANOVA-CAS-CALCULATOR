# TRANSCENDENTAL-RISCH-PRACTICAL-FORMAL-CHECKPOINT0

Date: 2026-07-01

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

Audit only. This checkpoint closes the 12-milestone formal transcendental Risch push without changing runtime behavior, solver routes, Display schema, public Calculus schema, History, OOE, Tauri, persistence, or public strategy labels.

The purpose is to record what the push landed, what is live versus proof-only, how benchmark-ready the integration layer is, and what should come next.

## What Landed In The Formal Push

The 12-milestone push moved Calcwiz from selected certificate families toward method-level formal infrastructure:

1. `TRANSCENDENTAL-TOWER-NORMAL-FORM1`
   - Added canonical internal tower-normal-form evidence over the existing transcendental profiler.
   - Records base field scope, selected variable, ordered generators, derivative-rule descriptors, merged facts, proof mode, and formal caps.

2. `TRANSCENDENTAL-DERIVATION-CLOSURE2`
   - Added proof-local derivation closure over tower normal forms.
   - Keeps Compute Engine fallback, numeric confidence, decimals, branch-sensitive carriers, and unsupported heads out of proof paths.

3. `TRANSCENDENTAL-PARAMETRIC-RDE1`
   - Added bounded coefficient-comparison solving for first-order Risch differential equations.
   - Supports exact-rational degree up to `12` and target-free symbolic degree up to `10` for direct proof evidence.

4. `TRANSCENDENTAL-PRIMITIVE-EXTENSION-RISCH1`
   - Added primitive/logarithmic extension proof objects for towers where the generator derivative lies in the previous field.
   - Covers direct proof evidence for log/primitive tower readiness, not live textbook catchup.

5. `TRANSCENDENTAL-EXPONENTIAL-EXTENSION-RISCH1`
   - Added exponential-extension proof objects where `theta'/theta` lies in the previous field.
   - Generalizes exp-quadratic and depth-2 exponential evidence without adding broad live dispatch.

6. `TRANSCENDENTAL-LIOUVILLE-SOLVER1`
   - Added a Liouville solver-driver surface that classifies proof outcomes as rational parts, logarithmic residuals, RDE obligations, named special-function proof evidence, or controlled stops.

7. `TRANSCENDENTAL-RATIONAL-LOG-PART-LRT-LIFT1`
   - Lifted the direct-test LRT logarithmic-completion path to the formal algebraic descriptor cap `8`.
   - LRT remains Integration/RN-owned; Equation has no consumer.

8. `TRANSCENDENTAL-ALGEBRAIC-CONSTANTS-AND-TRACE1`
   - Added algebraic constant descriptors and trace readback evidence for named-root logarithmic sums.
   - This supports LRT proof/readback but is not full algebraic function-field Risch.

9. `TRANSCENDENTAL-DEGENERACY-BRANCH-SOLVER1`
   - Added bounded branch evidence for vanished pivots, slopes, resultants, discriminant signs, and special parameters.
   - Branch rows cap at `12`; over-cap combinations stop cleanly.

10. `TRANSCENDENTAL-DEPTH2-GENERALIZATION1`
    - Generalized depth-2 proof readiness beyond currently live named special-function families.
    - Depth-2 compositions such as exp-over-trig, trig-over-log, and log-over-exp now defer at the reduced-equation layer with explicit proof-scope evidence.

11. `TRANSCENDENTAL-CERTIFICATE-ORCHESTRATOR1`
    - Added one internal certificate chooser after Tier-I/RN routes miss.
    - The chooser selects named special-function answers, non-elementary certificates, elementary route-owned outcomes, or controlled proof stops from the Liouville proof record.

12. `TRANSCENDENTAL-RISCH-PRACTICAL-FORMAL-CHECKPOINT0`
    - This audit records the post-push position and next recommendations.

## Live Versus Proof-Only

Live user-facing behavior now includes the earlier practical certificate families and the new orchestrator wiring:

- Exp-quadratic special-function answers:
  - `e^(a*v^2+b*v+c)` can return `erf/erfi` answers with certificate details.
- Affine quotient special-function answers:
  - `sin(u)/u` and `cos(u)/u` can return `Si/Ci` answers.
  - `e^u/u` and `1/ln(u)` can return `Ei/li` answers.
- Depth-2 composition special-function answers:
  - `e^(e^u)`, `sin(e^u)`, and `cos(e^u)` with affine `u` can return `Ei(e^u)`, `Si(e^u)`, or `Ci(e^u)`.
- Exact-rational quadratic trig special-function answers:
  - `sin(q(v))` and `cos(q(v))` with nonconstant exact-rational quadratic `q` can return `FresnelS/FresnelC`.
- Quotient-power recurrence answers:
  - `sin(u)/u^n`, `cos(u)/u^n`, and `e^u/u^n` with affine `u` and powers `2..6` can return bounded `Si/Ci/Ei` recurrence answers.
- Bounded RN/Tier-I elementary ownership still has precedence.

Proof-only or direct-test infrastructure now includes:

- tower normal forms
- proof-local derivation closure
- parametric RDE solving
- primitive/exponential extension proof objects
- Liouville solver-driver classification
- lifted LRT proof evidence
- algebraic constant/trace evidence
- degeneracy branch evidence
- generalized depth-2 readiness

These proof-only layers are deliberately not exposed as public strategy labels.

## Practical Position

For student and engineering workflows, Calcwiz is now strong enough to begin a serious Stewart/Thomas-style benchmark sweep:

- Many elementary textbook families are already owned by Rubi Tier-I and bounded RN.
- Common named special-function antiderivatives now produce usable main answers rather than generic failures.
- Non-elementary certificate results are distinct from heuristic unsupported results.
- The new formal infrastructure makes future widening safer because proof obligations are represented before live adoption.

The benchmark sweep should record each problem as one of:

- elementary-owned by Tier-I/RN
- named special-function answer
- non-elementary certificate
- controlled unsupported with a proof-scope reason
- parser/readback/UI issue

## Not Full Formal Risch Yet

Calcwiz is still not unrestricted formal transcendental Risch.

Remaining formal gaps include:

- recursive tower solving for arbitrary elementary towers
- depth-3 and higher tower recursion
- general Risch differential equation solving beyond current bounded coefficient-comparison cases
- full primitive-extension and exponential-extension solving as live dispatch paths
- algebraic function-field Risch
- full constant-field algebra for algebraic extensions
- broad LRT over symbolic coefficient fields and repeated/degenerate resultants
- complete complex branch constants, cuts, and readback
- formal non-existence certificates outside admitted tower families
- broad assumptions/fact management beyond current visible supplements

The honest position after this push is:

- practical bounded integration for student/engineering scope: high and ready for textbook benchmarking
- formal transcendental proof infrastructure: substantial and now method-shaped
- unrestricted formal transcendental Risch: still incomplete, with research-grade algebraic/tower/branch work remaining

## Recommended Next Direction

Do not jump immediately to depth-3 live adoption or full algebraic Risch.

Recommended sequence:

1. Run the Stewart/Thomas benchmark sweep when the books/problems are supplied.
2. Fix parser/readback/input gaps exposed by real textbook problems.
3. Promote only proof-clean textbook gaps into formal milestones.
4. Add a depth-3 tower audit before implementation.
5. Add an algebraic-extension audit before any algebraic function-field Risch work.
6. Widen RDE solving only where the tower normal-form and Liouville layers can prove obligations directly.

## Closeout Statement

`TRANSCENDENTAL-RISCH-PRACTICAL-FORMAL-CHECKPOINT0` closes the approved 12-milestone formal push. The next best work is benchmark-driven validation plus targeted formal gaps, not claiming full Risch completeness or adding isolated special-function patches without proof infrastructure.
