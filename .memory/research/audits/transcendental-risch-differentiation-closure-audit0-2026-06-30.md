# TRANSCENDENTAL-RISCH-DIFFERENTIATION-CLOSURE-AUDIT0

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

This audit checks whether certificate-grade transcendental Risch work needs a differentiation rewrite before live certificates.

## Bottom Line

No broad differentiation-core rewrite is needed before the first certificate slices.

The existing symbolic differentiator is already broad enough for the likely first certificates, especially `e^(quadratic)` and rational/log-derivative proof support. The required work is a proof-local hardening layer:

- deny Compute Engine fallback during certificate proofs
- reject inexact scalar leakage
- normalize/canonicalize tower heads before differentiation
- record direct-closure evidence and stop reasons
- add focused certificate-closure tests before any live non-elementary claim

## Current Direct Differentiation Coverage

Current direct support in `src/lib/symbolic-engine/differentiation.ts` includes:

- constants, selected variable, and target-free symbols
- exact scalar nodes through polynomial-core scalar readers
- `Negate`, `Add`, `Multiply`, and `Divide`
- finite numeric powers
- general power rule
- `ExponentialE^u`
- positive exact-rational and positive numeric bases raised to variable-dependent exponents
- `Ln`, common `Log`, and special direct derivatives for `ln(abs(u))`, `ln(sin(u))`, and `ln(cos(u))`
- `Sin`, `Cos`, `Tan`, `Cot`, `Sec`, and `Csc`
- `Sqrt` and `Abs`
- `Arcsin`, `Arccos`, `Arctan`
- `Arsinh`, `Arcosh`, `Artanh`

The differentiator already exposes `differentiateAstWithMetadata(..., { computeEngineFallback: 'deny' })`, which is the key primitive certificate work should build on.

## Current Preflight Coverage

`src/lib/symbolic-engine/differentiation-preflight.ts` already classifies:

- direct-symbolic expressions
- small Compute Engine fallback candidates
- unsupported relation/piecewise/list/matrix/integral/limit/derivative/sum/product heads
- malformed MathJSON
- over-budget expressions

This is useful for user-facing derivative workflows, but certificate proofs need stricter semantics than "fallback candidate."

## Certificate-Unsafe Areas

The following are acceptable for ordinary derivative UX but not for theorem-backed certificate proof:

- default differentiation can call Compute Engine for unknown heads
- Calculus antiderivative verification uses a broader backcheck path and can eventually produce numeric-confidence status
- simplification can collapse numeric `Divide` nodes into JavaScript numbers when both children are numbers
- `Exp` as a distinct head is not a direct differentiator branch; current direct `e^u` support expects `Power` with base `ExponentialE`
- multi-argument log/base-specific log forms are not part of the certificate-safe closure unless normalized first
- `Abs` has a formal derivative rule but remains branch-sensitive and should be rejected or fact-guarded in certificate profiles
- special functions such as `erf`, `erfi`, `Si`, and `Ci` are fallback heads today; their differentiation should not be required until special-function readback is approved

## Required Proof-Local Differentiation Wrapper

Before live certificates, add an internal wrapper such as `differentiateForCertificateProof(node, variable)` with these properties:

- calls the direct differentiator with `computeEngineFallback: 'deny'`
- runs certificate-specific preflight first
- rejects or normalizes unsupported tower heads before differentiation
- rejects decimal/inexact numeric leaves unless explicitly allowed by the certificate family
- returns:
  - derivative node
  - strategies used
  - closure heads observed
  - proof-safe or stop result
  - stop reason when closure fails
- never returns Compute Engine fallback evidence as proof

This wrapper should live near symbolic-engine differentiation or under an integration/transcendental-certificate folder, but it should be domain-neutral enough to avoid route-local duplication.

## First Closure Targets

For `e^(quadratic)` certificates:

- `d/dx e^(x^2) = 2x e^(x^2)`
- `d/dx e^(-x^2) = -2x e^(-x^2)`
- `d/dx e^(a*x^2+b*x+c) = (2a*x+b)e^(a*x^2+b*x+c)`
- stop if the exponent is not a selected-variable polynomial of degree exactly `2`
- require visible fact `a\ne0` for symbolic quadratic coefficient forms

For sine-integral certificate readiness:

- `d/dx sin(x)` and `d/dx cos(x)` are direct
- rational factors such as `1/x` must be exact rational nodes
- stop on non-affine arguments until a dedicated certificate family exists

For log-log readiness:

- `d/dx ln(ln(x)) = 1/(x ln(x))` is direct if the expression is normalized as nested `Ln`
- domain facts and branch language are stronger blockers than differentiation itself

## Test Gaps To Close

Add focused tests before live certificates for:

- direct no-fallback derivative of `e^(x^2)`
- direct no-fallback derivative of `e^(-x^2)`
- direct no-fallback derivative of `e^(a*x^2+b*x+c)`
- direct no-fallback derivative of `ln(ln(x))`
- direct no-fallback derivative of `sin(x)/x`
- stop for `erf(x)` when fallback is denied
- stop or normalize for direct `Exp(...)` head
- stop for decimal/inexact leaves in certificate mode
- stop for `Abs(x)e^(x^2)` as branch-sensitive

## Relationship To Limits And Numeric Logic

Limits are not a prerequisite for the first indefinite non-elementary certificates.

Useful later:

- explaining convergence/divergence of definite or improper integrals
- offering adaptive quadrature after a non-elementary certificate for definite bounds

Not part of this differentiation closure:

- Equation numeric root solving
- interval search
- broad asymptotics
- numeric sampling as proof evidence

## Suggested Next Six Moves

1. `TRANSCENDENTAL-RISCH-CERTIFICATE-PROOF-DIFF1`
   - add the proof-local differentiation wrapper and tests
   - no live certificate adoption

2. `TRANSCENDENTAL-RISCH-TOWER-PROFILE1`
   - classify rational base, exp extension, log extension, trig/native sin-cos, and depth-2 stops
   - include constant-field and selected-variable coefficient evidence

3. `TRANSCENDENTAL-RISCH-CERTIFICATE-RESULT-SHAPE1`
   - internal certificate result type and Display-compatible readback payload
   - distinguish unsupported from proven non-elementary without public `risch` strategy

4. `TRANSCENDENTAL-RISCH-EXP-QUADRATIC-PROOF1`
   - behavior-invisible proof engine for `e^(quadratic)` non-elementarity
   - direct tests only; no dispatch adoption until readback is acceptable

5. `TRANSCENDENTAL-RISCH-EXP-QUADRATIC-CERTIFICATE1`
   - live scoped certificate for `e^(x^2)`, `e^(-x^2)`, and symbolic quadratic exponents under facts
   - no special-function result unless policy is approved

6. `TRANSCENDENTAL-SPECIAL-FUNCTION-READBACK-AUDIT0`
   - decide how `erf`, `erfi`, `Si`, `Ci`, and named integral forms should appear
   - audit only before any special-function derivative/readback expansion

## Closeout

The differentiator is not the blocker as a broad system. The blocker is proof discipline. First certificate work should harden exact direct differentiation into a certificate-local contract and then build the smallest theorem-backed family on top.
