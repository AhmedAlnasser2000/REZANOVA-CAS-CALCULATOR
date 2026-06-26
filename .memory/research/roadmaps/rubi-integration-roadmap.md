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

## Milestone Sequence

1. `RUBI-TIER1-SECTION1-POLY-EXPAND1`
   - Status: implementation slice.
   - Adds bounded algebraic expansion into existing direct-rule integration.
   - Covers products and nonnegative integer powers with exact-rational and target-free symbolic coefficients.
   - Keeps public strategy as `direct-rule`.

2. `RUBI-TIER1-SECTION1-BINOMIAL-DERIVATIVE1`
   - Planned.
   - Widen derivative-factor binomial cases that are not already covered by current substitution.
   - Must avoid duplicating existing `u-substitution` wins.

3. `RUBI-TIER1-SECTION1-RATIONAL-NORMALIZE1`
   - Planned.
   - Audit and add only safe algebraic rewrites that feed the existing rational-function and partial-fraction core.
   - No broad normalizer or branch-sensitive rewrite.

4. `RUBI-TIER1-SECTION1-QUADRATIC-POWER-AUDIT0`
   - Planned audit.
   - Map discriminant-sensitive quadratic/trinomial power rules against branch/domain prerequisites before implementation.

5. Later Rubi tiers
   - Deferred until Section 1 slices have stable verification and stop behavior.
   - Lazy tier imports, Rubi provenance metadata, and visible rule-family labels remain separate decisions.

## Standing Stop Rules

- Fractional or symbolic powers of non-affine polynomials stop unless a named prerequisite slice owns the domain/readback policy.
- Negative powers route through derivative-ratio or rational partial fractions when already supported; they are not expanded by Rubi Section 1 expansion.
- `Abs`, roots, logs, trig, exp, and other branch/transcendental heads do not get solved around by algebraic expansion.
- Over-limit expansions stop without Compute Engine fallback changes or hidden source-mirror delegation.
