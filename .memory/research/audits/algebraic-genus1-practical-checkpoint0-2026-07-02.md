# ALGEBRAIC-GENUS1-PRACTICAL-CHECKPOINT0

Date: 2026-07-02
primary_agent: codex
primary_agent_model: gpt-5.5
recorded_by_agent: codex
recorded_by_agent_model: gpt-5.5
verified_by_agent: codex
verified_by_agent_model: gpt-5.5
attribution_basis: live

## Scope

This is a docs/memory-only checkpoint for the algebraic genus-1 research push. It records what is live, what is readiness-only, what remains deferred, and what should come next before definite-integral work or textbook benchmark sweeps.

No runtime behavior, schemas, tests, source code, Equation code, OOE, History, Tauri, or persistence changed in this checkpoint.

## What Is Live Now

- Genus-0 algebraic integration is live for practical one-radical affine/quadratic families:
  - affine square roots and reciprocal square roots,
  - exact-rational standard quadratic radicals,
  - bounded exact-rational rational-in-radical degree-2 numerator cases,
  - selected symbolic affine and centered-radius standard radical cases.
- Genus-1 boundary detection is live:
  - square-root cubic/quartic curves stop with elliptic/genus-1 deferred messaging instead of generic unsupported output.
- Legendre elliptic function substrate is live internally:
  - `EllipticF`, `EllipticE`, and `EllipticPi` readback and proof-local differentiation exist.
- Canonical Legendre genus-1 templates are live for indefinite integration:
  - `1/sqrt((1-x^2)(1-m*x^2))` returns `EllipticF(arcsin(x), m)`.
  - `sqrt((1-m*x^2)/(1-x^2))` returns `EllipticE(arcsin(x), m)`.
  - `1/((1-n*x^2)*sqrt((1-x^2)(1-m*x^2)))` returns `EllipticPi(n, arcsin(x), m)`.
- Canonical rational-in-radical Hermite bridge is live:
  - even quadratic numerator cases over first-kind radicals reduce to `EllipticF/E`.
  - even quadratic numerator cases over third-kind radicals reduce to `EllipticPi/F`.
  - selected target-free symbolic even numerator coefficients are live when facts stay explicit.
- Visible answer quality is now guarded:
  - elliptic answers carry proof detail cards through Calculus result assembly,
  - generated elliptic readback uses MathLive-safe operator names,
  - Playwright evidence covers facts, details, Copy Result, History replay, and overflow behavior.

## Current Caps And Guardrails

- One radical extension only.
- Cubic/quartic genus-1 work is practical and template-first, not a full algebraic function-field integrator.
- Legendre parameter convention is `m`.
- Named roots may appear in details, not raw `RootOf` in main answers.
- Branch rows are capped at 12.
- Exact-rational support precedes broad symbolic support.
- Symbolic adoption is limited to target-free parameter slices where facts and readback stay capped.
- Public strategy labels remain existing Calculus labels such as `u-substitution`.
- No public `algebraic-risch` strategy and no public result schema changes.
- Equation must not consume integration-owned elliptic/Risch machinery.

## Readiness-Only Coverage

- Exact-rational cubic/quartic curve profiling exists.
- Repeated-root degeneration facts exist.
- Exact-rational real branch facts exist for root ordering and radicand sign intervals.
- Named-root detail readback exists for exact-rational branch evidence.
- Legendre normal-form evidence exists for canonical templates and some generic root-based readiness.
- Differential-basis obligations exist for canonical first-, second-, and third-kind templates.
- Endpoint readiness exists for future definite elliptic integrals, including complete-integral notes and singularity facts.

## Remaining Gaps

- Generic exact-rational cubic/quartic curves are not yet transformed live into Legendre normal form beyond the canonical templates.
- Broad symbolic cubic/quartic branch splitting is not live.
- Odd numerators and general rational functions over cubic/quartic radicals are deferred.
- Multiple independent radicals, nested radicals, and degree `5+` radicals are deferred.
- Complex branch handling for elliptic forms is deferred.
- Genus-1 non-elementary certificates are deferred.
- Definite elliptic evaluation, complete-integral output, endpoint convergence decisions, and singular-principal-value policies are deferred.
- Textbook benchmark sweeping is not yet done; Stewart/Thomas exercises should become the next credibility pass when the user supplies the books.

## Practical Capability Position

Calcwiz now has practical indefinite algebraic integration across:

- high-frequency genus-0 textbook radicals,
- selected symbolic genus-0 radical families,
- live canonical genus-1 Legendre first-, second-, and third-kind templates,
- live bounded canonical rational-in-radical Hermite bridge,
- explicit elliptic boundary stops for noncanonical cubic/quartic radicals.

This is enough to start credible textbook benchmarking, but it is not complete genus-1 algebraic integration. The next useful work should be benchmark-driven unless the user wants another research push into generic cubic/quartic Legendre transformations or genus-1 certificates.

## Recommended Next Choices

1. Textbook benchmark pass:
   - ingest Stewart/Thomas integral sets,
   - classify failures into normalization, route coverage, readback, or truly deferred families,
   - fix clusters instead of one-off examples.
2. Generic exact-rational genus-1 Legendre transformation:
   - make root-based cubic/quartic normal forms live beyond canonical templates,
   - keep named-root details and branch caps.
3. Genus-1 certificate/readiness pass:
   - classify unsupported algebraic curves as elliptic/genus-1 with proof scope,
   - prepare later definite integral and complete elliptic output.
4. Definite integrals:
   - consume endpoint readiness,
   - decide convergence and complete-integral readback.

## Verification

- `npm run test:memory-protocol`
- `git diff --check`
