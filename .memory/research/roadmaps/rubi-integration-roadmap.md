# Rubi Integration Roadmap

status: active roadmap
created: 2026-06-26
primary_agent: codex
primary_agent_model: gpt-5-codex

## Purpose

This roadmap organizes Rubi-style rule-based integration work for Calcwiz.

Rubi is source context and mathematical rule knowledge, not a runtime dependency or parity mandate. Calcwiz translates narrow audited rule families into native MathJSON integration helpers, preserves current public Calculus result contracts, and accepts each antiderivative only through verification.

## Guardrails

- Use `playground/sources/mirrors/integration-rules/` only as static source context.
- Do not import, execute, copy, or depend on Rubi, SymPy Rubi, or source-mirror code from stable `src`.
- Add rule families only through the internal classifier route plan; do not append a large sequential strategy chain.
- Keep visible `CalculusIntegrationStrategy`, Display, History, OOE, Tauri, workspace, and persistence contracts stable unless a separate milestone approves widening.
- Prefer exact derivative backcheck. Numeric-confidence-only adoption needs a separate policy milestone.
- Preserve overlap precedence: inverse trig, derivative-ratio, partial fractions, substitution, direct, by-parts, then affine-linear.
- Keep branch-sensitive and domain-heavy algebraic transformations deferred until branch/domain fact and readback prerequisites are explicit.

## Current State

- `INTEGRATION-FORM-CLASSIFIER1` is live and routes integrands through existing families before any Rubi expansion.
- `RUBI-TIER1-SECTION1-AUDIT0` maps Section 1 Algebraic functions and identifies bounded positive-integer polynomial/binomial/trinomial expansion as the first value-adding slice.
- `RUBI-TIER1-SECTION1-POLY-EXPAND1` starts the Rubi tier by expanding bounded products and positive-integer polynomial powers into the existing direct integration path.
- `RUBI-TIER1-SECTION1-POLY-DEGREE-LIFT1` lifts the integration-local expansion and exact-backcheck caps for still-bounded higher-degree monomial output.

## Milestone Sequence

1. `RUBI-TIER1-SECTION1-POLY-EXPAND1`
   - Status: complete.
   - Adds bounded algebraic expansion into existing direct-rule integration.
   - Covers products and nonnegative integer powers with exact-rational and target-free symbolic coefficients.
   - Keeps public strategy as `direct-rule`.

2. `RUBI-TIER1-SECTION1-POLY-DEGREE-LIFT1`
   - Status: implementation slice.
   - Raises integration-local expansion/backcheck caps for higher-degree monomials produced by bounded polynomial powers.
   - Keeps term/node caps and exact original-integrand backcheck.

3. `RUBI-TIER1-POLY-BYPARTS-FEEDER1`
   - Planned.
   - Feeds bounded expanded polynomial factors into the existing integration-by-parts solver.
   - Keeps public strategy as `integration-by-parts`.

4. `RUBI-TIER1-SECTION1-QUADRATIC-RECIPROCAL-POWER1`
   - Planned.
   - Adds a narrow repeated irreducible-quadratic reciprocal power case such as `1/(1+x^2)^2`.
   - Preserves inverse-trig precedence for power `1` and defers broader recurrence machinery.

5. `CALCULUS-INTEGRALS-EDITOR-SOURCE1`
   - Planned UI slice after backend work and after overlapping Display-lane dirty files clear.
   - Makes Calculus integral screens edit integrands through the main editor and removes duplicate lower integrand editors.

6. Later Rubi tiers
   - Deferred until Section 1 slices have stable verification and stop behavior.
   - Lazy tier imports, Rubi provenance metadata, and visible rule-family labels remain separate decisions.

## Standing Stop Rules

- Fractional or symbolic powers of non-affine polynomials stop unless a named prerequisite slice owns the domain/readback policy.
- Negative powers route through derivative-ratio or rational partial fractions when already supported; they are not expanded by Rubi Section 1 expansion.
- `Abs`, roots, logs, trig, exp, and other branch/transcendental heads do not get solved around by algebraic expansion.
- Over-limit expansions stop without Compute Engine fallback changes or hidden source-mirror delegation.
