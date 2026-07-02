# ALGEBRAIC-GENUS0-SYMBOLIC-SCOPE-AUDIT0

Date: 2026-07-02

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

Audit only. This milestone records the safe shape for a symbolic-from-start genus-0 algebraic integration push. It does not change runtime behavior, solver dispatch, public Calculus result schemas, Display schemas, Equation code, History, OOE, Tauri, persistence, or integration routes.

The user decisions locked for this audit are:

- Symbolic coefficients should be considered from the start, not deferred to a later catchup pass.
- Genus-0 readback may choose case by case between classic logarithmic/trigonometric inverse forms and inverse-hyperbolic forms.
- Implementation milestones are not locked by this audit; the audit should recommend the final count and prerequisites.

## Existing Reusable Primitives

The current repo has useful pieces, but not yet an integration-owned genus-0 method layer.

- Radical parsing and simplification:
  - `src/lib/algebra/radical/` recognizes supported radical/rational-power shapes, affine terms, conjugates, and perfect-square radicands for algebraic transforms.
  - `src/lib/symbolic-engine/radical/` and `src/lib/symbolic-engine/radical.ts` support symbolic radical normalization/rationalization used by Calculate/transform paths.
- Exact polynomial and rational infrastructure:
  - `src/lib/algebra/polynomial-core/`, `src/lib/algebra/rational-function/`, and `src/lib/symbolic-engine/integration/rational.ts` provide exact polynomial/rational parsing and rational antiderivative routes.
  - RN/LRT infrastructure already handles bounded rational pullbacks after an algebraic substitution, especially when the transformed integrand is rational.
- Existing radical integration slice:
  - `src/lib/symbolic-engine/integration/trig-substitution-radicals.ts` owns exact-rational affine forms such as `sqrt(r-u^2)`, `sqrt(r+u^2)`, and `sqrt(u^2-r)`.
  - This is a rule family, not a general genus-0 parametrization engine.
- Facts and readback:
  - `src/lib/algebra/exact-supplements.ts`, assumption/readback helpers, and existing certificate/detail sections can carry nonzero, positivity, branch, and denominator facts.
  - Symbolic coefficient routes must use these shared fact surfaces rather than inventing route-local condition text.
- Verification:
  - `src/lib/calculus/engine/verification.ts` and radical-equivalence support exact backchecks for many current algebraic outputs.
  - Future genus-0 adoption should remain proof/backcheck based and must not use numeric-confidence adoption.

## Genus-0 Boundary

The practical genus-0 target is one algebraic radical extension that can be rationally parametrized:

- `R(v, sqrt(q(v)))` where `v` is the selected integration variable.
- First live radicands should be affine or quadratic in `v`.
- Target-free symbolic coefficients are allowed only when branch facts and readback can be represented visibly.
- Multiple independent radicals, nested radicals, and arbitrary algebraic function fields remain out of scope.

The genus-1 boundary begins at squarefree cubic/quartic radical curves such as:

- `sqrt(v^3+v+1)`
- `1/sqrt(v^3-v+1)`
- `sqrt(v^4+v+1)`

Those should not be silently treated as unsupported generic failures. A later boundary milestone should report them as beyond the genus-0 rationalization layer and deferred to elliptic/genus-1 work.

## Readback Policy

Readback is case by case.

- Classic calculus forms remain preferred when they are clear and textbook-aligned:
  - `arcsin`
  - `arctan`
  - logarithms such as `ln|v+sqrt(v^2+1)|`
- Inverse-hyperbolic forms may be used when they are genuinely cleaner, but only after the required heads are supported:
  - input canonicalization for `asinh`, `acosh`, and possibly `atanh`
  - exact differentiation rules
  - copy/readback in rendered/LaTeX/plain-text notation
  - verification/backcheck coverage
  - branch/domain facts
- No answer should introduce a new function head only as a cosmetic shortcut.
- Large generated radical answers should be node-backed where possible, with producer-side readback only where node rendering is worse.

## Symbolic-Coefficient Risks

Symbolic coefficients from the start are feasible, but they force a wider prerequisite layer than exact-rational-only genus 0.

Required symbolic facts include:

- affine slope nonzero
- radicand leading coefficient nonzero
- discriminant sign or completed-square sign
- square-root branch/domain constraints
- denominator nonzero constraints after substitution
- substitution inverse validity

The first implementation batch should avoid broad assumptions solving. It should emit generic `Valid When`/casewise facts where facts are explicit and stop cleanly when the symbolic branch set would explode or require unimplemented assumptions.

## Recommended Implementation Sequence

The audit recommends nine follow-on milestones, not seven, because symbolic coefficients and case-by-case readback need separate gates.

1. `ALGEBRAIC-GENUS0-RADICAL-PROFILER1`
   - Profile `R(v, sqrt(q(v)))`, selected variable, coefficient scope, radicand degree, radical count, and stop reasons.
   - Behavior-invisible first, with direct tests.

2. `ALGEBRAIC-GENUS0-SYMBOLIC-FACTS1`
   - Add integration-owned fact/readiness helpers for radicand positivity, discriminant sign, nonzero slopes, branch domains, and substitution denominators.
   - Reuse existing exact supplement/fact readback paths; do not import Equation-owned wrappers.

3. `ALGEBRAIC-GENUS0-PARAMETRIZATION1`
   - Build rational parametrization evidence for affine radicals and completed-square quadratic radicals.
   - Produce `v = phi(t)`, `sqrt(q(v)) = psi(t)`, `dv = phi'(t)dt`, plus facts.

4. `ALGEBRAIC-GENUS0-PULLBACK-RATIONAL-INTEGRATION1`
   - Substitute into the integrand, reduce to a rational function in the parameter, and delegate to existing rational/Hermite/LRT integration.
   - Behavior can remain direct-test/readiness until inverse readback is available.

5. `ALGEBRAIC-GENUS0-INVERSE-READBACK1`
   - Convert parameter answers back to the selected variable with clear log/trig/hyperbolic readback policy.
   - Add any approved inverse-hyperbolic input/differentiation/copy support before using those heads in main answers.

6. `ALGEBRAIC-GENUS0-STANDARD-RADICAL-FAMILIES1`
   - Make the common textbook families live: affine square roots, reciprocal affine square roots, `sqrt(a^2-u^2)`, `1/sqrt(a^2-u^2)`, `sqrt(a^2+u^2)`, and `sqrt(u^2-a^2)`.

7. `ALGEBRAIC-GENUS0-RATIONAL-IN-RADICAL1`
   - Make bounded `R(v, sqrt(q(v)))` forms live after rational pullback and inverse readback are proven.
   - Keep one radical extension only and enforce degree/node caps.

8. `ALGEBRAIC-GENUS0-SYMBOLIC-BRANCH-COVERAGE1`
   - Widen live symbolic coefficient coverage with casewise branches only where facts stay readable and branch count stays capped.
   - Stop cleanly on ambiguous or over-cap symbolic branch families.

9. `ALGEBRAIC-GENUS0-GENUS1-BOUNDARY1`
   - Add behavior-visible controlled stops for squarefree cubic/quartic radicals that appear beyond genus 0.
   - Record readiness for later elliptic/genus-1 certificates without implementing genus 1.

## Future Manual Test Matrix

These are intended future acceptance cases, not current runtime claims from this audit.

| Input | Expected future result shape |
| --- | --- |
| `sqrt(x+1)` | `2/3*(x+1)^(3/2)` with affine-radical facts when needed |
| `1/sqrt(x+1)` | `2*sqrt(x+1)` |
| `sqrt(x^2+1)` | `1/2*x*sqrt(x^2+1)+1/2*ln|x+sqrt(x^2+1)|`, or a verified `asinh(x)` form if that readback head is approved |
| `1/sqrt(x^2+1)` | `ln|x+sqrt(x^2+1)|`, or verified `asinh(x)` |
| `sqrt(4-x^2)` | `x/2*sqrt(4-x^2)+2*arcsin(x/2)` with real-domain facts |
| `1/sqrt(4-x^2)` | `arcsin(x/2)` with real-domain facts |
| `x/sqrt(x^2+1)` | `sqrt(x^2+1)` |
| `x^2/sqrt(x^2+1)` | `1/2*x*sqrt(x^2+1)-1/2*ln|x+sqrt(x^2+1)|`, or verified hyperbolic equivalent |
| `1/sqrt(a*x^2+b*x+c)` | Casewise symbolic readback only when leading-coefficient/discriminant/domain facts are explicit and readable |
| `sqrt(x^3+x+1)` | Controlled beyond-genus-0 stop; no generic failure |

## Explicit Deferrals

- Genus 1 and elliptic-integral adoption.
- Nested radicals and multiple independent radicals.
- Arbitrary algebraic function-field Risch.
- Broad complex branch/cut handling.
- Equation consumption of integration-owned genus/Risch machinery.
- Public `algebraic-risch` or `genus` strategy labels.
- Runtime dependency on Rubi, SymPy, FriCAS, or source mirrors.

## Audit Conclusion

Genus 0 is a medium-sized method layer. It should not be implemented as a pile of radical rules. The next implementation batch should first create an integration-owned algebraic radical profiler and symbolic fact substrate, then rationalize through parametrization, delegate pullbacks to existing rational/LRT machinery, and only then make standard and rational-in-radical families live.

Because symbolic coefficients and case-by-case readback are required from the start, the safe follow-on plan is nine major gated milestones rather than seven.
