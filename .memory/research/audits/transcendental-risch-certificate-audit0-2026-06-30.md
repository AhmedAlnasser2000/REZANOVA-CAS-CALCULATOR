# TRANSCENDENTAL-RISCH-CERTIFICATE-AUDIT0

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

Audit only. No runtime behavior, source code, Display, History, OOE, Tauri, persistence, public Calculus schema, public strategy label, or solver route changes.

This audit answers whether Calcwiz should keep widening Risch-Norman or begin a theorem-backed non-elementary certificate track.

## Recommendation

Calcwiz should not chase unrestricted Risch-Norman completeness as the next integration target.

The practical bounded RN layer is now strong enough for the student and engineering families Calcwiz wants to serve. The next high-value integration direction is a scoped transcendental Risch certificate track: when a common-looking indefinite integral is non-elementary, Calcwiz should eventually say that with proof context instead of returning a generic unsupported message.

Depth-2 tower widening should be audited separately before implementation. Some depth-2 cases are useful, but rushing them risks turning RN into a research-grade family chase without certificate value.

## What Certificate Means

A certificate is not "we tried every rule and failed." It is a theorem-backed statement of the form:

- No elementary antiderivative exists in a stated differential field.
- The field/tower and constants used by the statement are explicit.
- Required assumptions and exclusions are visible.
- The proof reason is stable under exact differentiation and symbolic normalization.

The user-facing form should be educational:

- "No elementary antiderivative in the standard elementary functions over this field."
- "This integral is represented by a special function such as `erfi`, `Si`, or an unevaluated named integral."
- "Numeric definite integration may still be available for definite bounds."

Unsupported is different from certified non-elementary. The UI/readback must preserve that distinction.

## Current Assets We Can Reuse

Already useful:

- internal MathJSON antiderivative nodes for successful RN outputs
- exact differentiation and backcheck infrastructure for many elementary heads
- selected-variable and target-free coefficient discipline
- shared coefficient domain for exact-rational plus target-free symbolic coefficients
- bounded symbolic polynomial and resultant primitives
- Hermite-style rational reduction and bounded LRT rational log completion
- RN tower-basis profiling for rational, exp, sin/cos, exp-sincos, affine-log, log-derivative, Hermite, and LRT-rational families
- visible exact-supplement facts such as nonzero pivots and domain assumptions

These assets are necessary but not sufficient for certificate-grade work.

## Required Prerequisites And Upgrades

### Representation

Required before live certificates:

- A certificate result object internal to Calculus/Integration, not a public `risch` strategy label yet.
- Node-first proof evidence; LaTeX-only certificates are not acceptable.
- A stated differential field/tower descriptor, such as rational field plus one exponential extension.
- A clear distinction between:
  - proven elementary antiderivative
  - proven non-elementary in a stated field
  - unsupported because the field/tower is outside scope
  - stopped because caps or facts are missing

Upgrade needed:

- RN/tower descriptors should become reusable certificate descriptors, not only route-planning evidence.

### Differentiation

Required:

- Exact differentiation closure for every head the certificate track reasons about.
- Chain/product/quotient/power rules must be exact for certificate inputs.
- Derivatives of `exp`, positive-base exponentials, `ln/log`, `sin/cos`, and rational functions must remain node-first and proof-checkable.

Upgrade needed:

- Add focused derivative tests for any new certificate family before declaring non-elementarity.
- Do not certify a family if the derivative engine cannot express the tower derivative exactly.

### Simplification And Equality

Required:

- Exact residual normalization for rational/log-derivative checks.
- No numeric-confidence adoption.
- Exact zero checks must be field-aware, bounded, and able to stop honestly.

Upgrade needed:

- Strengthen proof-local normalization around differential-field expressions instead of broad global simplification.
- Keep denominator and branch facts visible when simplification depends on them.

### Differential Field And Constant Field

Required:

- Identify the selected variable and constants with respect to it.
- Identify elementary extensions in a bounded tower.
- Track whether a coefficient is target-free or selected-variable-dependent.
- State the constant field used by the certificate.

Upgrade needed:

- Add an internal `transcendental-certificate-profile` layer that classifies:
  - rational base field
  - exp extension
  - log extension
  - trig-as-exp or native sin/cos extension
  - nested/depth-2 tower stop reason

### Liouville/Risch Proof Core

Required:

- A Liouville-form proof surface: elementary antiderivatives must be rational part plus constant multiples of logarithms in the modeled field.
- Log-derivative solving must be exact and proof-recorded.
- Residual contradiction evidence must be simple enough to read back.

Upgrade needed:

- Start with one or two certificate families rather than a general Risch engine.
- Reuse Hermite/LRT only where the residual is rational in the chosen field; do not pretend LRT proves arbitrary transcendental non-elementarity.

### Facts, Branches, And Domains

Required:

- Visible facts for nonzero pivots, positive bases, log domains, and denominator exclusions.
- Clear branch-language: certificate statements are field/theorem statements, not global complex-analytic claims.

Upgrade needed:

- Use exact supplement facts for prerequisites.
- Add a certificate detail card explaining assumptions separately from Valid When facts when needed.

### Limits And Numeric Logic

Limits are not the core prerequisite for transcendental Risch certificates.

Useful but secondary:

- Definite/improper integrals may use limits and adaptive numeric quadrature after symbolic non-elementarity.
- Limits can help explain convergence/divergence for definite or improper workflows.

Not required for the first indefinite certificate slice:

- broad asymptotic limit machinery
- numeric root search
- Equation-owned interval solving

Boundary:

- Equation numeric/root-solving work should not be pulled into this track.
- Calculus definite numeric fallback remains an integration-owned Layer 5 concern.

### Readback And UX

Required:

- A dedicated non-elementary/certificate display shape or existing Display-compatible supplement that says "proven non-elementary" without implying solver failure.
- Copy/readback must respect math notation mode and avoid raw proof internals.
- The answer should offer a named special-function representation only when one is in scope and exact.

Upgrade needed:

- Add readback examples before live adoption, because confusing certificate wording is worse than a clean unsupported stop.

## Candidate First Certificate Slices

Best first slice:

- `exp-quadratic-certificate1`
- Target examples:
  - `e^(x^2)`
  - `e^(-x^2)`
  - `e^(a*x^2+b*x+c)` under explicit nonzero quadratic coefficient facts
- Educational output can mention `erfi`/`erf` only if special-function readback is approved; otherwise say no elementary antiderivative and keep the special-function representation deferred.

Why first:

- High-frequency in engineering/probability.
- Easy for users to recognize.
- Demonstrates the value of a theorem-backed stop.
- Avoids broad nested tower handling.

Second possible slice:

- `sine-integral-certificate1`
- Target examples:
  - `sin(x)/x`
  - `cos(x)/x` if facts/readback are ready
- Likely output references `Si`/`Ci` only after special-function policy is approved.

Third possible slice:

- `log-log-certificate-readiness0`
- Target examples:
  - `ln(ln(x))`
  - `1/ln(x)`
- Audit/readiness first, because these are more branch/domain sensitive and can confuse users.

## What Not To Do Next

- Do not implement a public `risch` or `risch-norman` strategy label.
- Do not claim full Risch or general Risch-Norman completeness.
- Do not widen RN tower depth just because an expression is depth-2.
- Do not use numeric sampling as non-elementary evidence.
- Do not expose raw algebraic proof objects or internal resultant machinery as user-facing proof.
- Do not make Equation consume RN/LRT/certificate machinery.

## Suggested Milestone Sequence

1. `TRANSCENDENTAL-RISCH-CERTIFICATE-SUBSTRATE1`
   - internal certificate result type, tower profile, proof reason enum, and stop reasons
   - no runtime adoption

2. `TRANSCENDENTAL-RISCH-EXP-QUADRATIC-CERTIFICATE1`
   - live proof-backed non-elementary message for `e^(quadratic)` forms
   - exact facts and no numeric-confidence adoption

3. `TRANSCENDENTAL-SPECIAL-FUNCTION-READBACK-AUDIT0`
   - decide how `erf`, `erfi`, `Si`, `Ci`, and named integral forms appear
   - audit only

4. `TRANSCENDENTAL-RISCH-SINE-INTEGRAL-CERTIFICATE1`
   - scoped certificate for `sin(x)/x` and nearby affine/exact-rational variants if prerequisites hold

5. `RN-DEPTH2-TOWER-READINESS0`
   - classify depth-2 towers and decide which are useful enough for bounded RN versus certificate-only stops

## Closeout

The next integration leap should be certificate-first. Practical RN is already strong enough that more breadth has diminishing product value; theorem-backed non-elementary messages are a sharper product differentiator and a better educational fit.
