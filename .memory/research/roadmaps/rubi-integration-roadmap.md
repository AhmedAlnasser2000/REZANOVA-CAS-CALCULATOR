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
- `RUBI-TIER1-POLY-BYPARTS-FEEDER1` feeds bounded expanded polynomial factors into the existing integration-by-parts path without changing visible strategy metadata.
- `RUBI-TIER1-SECTION1-QUADRATIC-RECIPROCAL-POWER1` adds a narrow exact-backchecked repeated quadratic reciprocal power under visible `partial-fractions`.
- `RUBI-TIER1-AFFINE-POWER1` adds exact-rational affine power support for `(m*x+n)^p`, including bounded integer powers, `p=-1` logarithms, and selected negative powers under existing visible strategies.
- `RUBI-TIER1-BINOMIAL-DERIVATIVE-SUB1` adds exact-rational derivative-present binomial substitution as a visible `u-substitution` fallback with exact backcheck.
- `RUBI-TIER1-REPEATED-LINEAR-RATIONAL1` keeps repeated exact linear rational families under visible `partial-fractions`, including high single affine reciprocals and bounded mixed repeated-linear products.
- `RUBI-TIER1-QUADRATIC-RECIPROCAL-NUMERATOR1` adds exact-rational affine numerator support for `(A*u+B)/(c+u^2)^2`, preserving substitution precedence for pure derivative numerators.
- `RUBI-TIER1-QUADRATIC-RECIPROCAL-POWER-LIFT1` lifts constant repeated quadratic reciprocal powers to exactly `3` and `4` through bounded recurrence formulas.
- `RUBI-TIER1-RATIONAL-QUADRATIC-MIXED1` verifies bounded exact-rational mixed linear plus one irreducible quadratic partial fractions through the existing rational-function core.
- `RUBI-TIER1-QUADRATIC-RECIPROCAL-NONSQUARE1` extends literal repeated quadratic reciprocal powers to positive exact-rational nonsquare constants for powers `2..4`, keeping exact verifier adoption through constant-radical normalization.
- `RUBI-TIER1-QUADRATIC-COMPLETE-SQUARE1` adds exact-rational completed-square normalization for irreducible quadratic reciprocal powers, including scalar factors.
- `RUBI-TIER1-QUADRATIC-NUMERATOR-POWER-LIFT1` lifts exact-rational affine numerator support for repeated quadratic reciprocal powers to powers `3` and `4`.
- `RUBI-TIER1-MULTI-QUADRATIC-PARTIAL-FRACTIONS1` extends exact-rational rational partial fractions to at most two irreducible quadratic factor groups, each multiplicity capped at `2`.
- `RUBI-TIER1-AFFINE-LOG-BYPARTS1` adds exact-rational polynomial times affine-log integration by parts, including bounded expanded polynomial factors, under visible `integration-by-parts`.
- `RUBI-TIER1-RECIPROCAL-BINOMIAL-SUB1` adds exact-rational derivative-present reciprocal binomial substitution under visible `u-substitution`.
- `CALCULUS-ANSWER-PREVIEW-AUTOSIZE1` completes the adjacent UI polish for large/nested calculus answer and generated-preview cards without changing public result contracts.
- `INTEGRATION-RATIONAL-PF-PERF-SPLIT-AUDIT0` splits and times the rational partial-fractions regression suite. The current hotspot is exact verifier/equivalence normalization for nonsquare and completed-square repeated-quadratic arctan outputs.

## Milestone Sequence

1. `RUBI-TIER1-SECTION1-POLY-EXPAND1`
   - Status: complete.
   - Adds bounded algebraic expansion into existing direct-rule integration.
   - Covers products and nonnegative integer powers with exact-rational and target-free symbolic coefficients.
   - Keeps public strategy as `direct-rule`.

2. `RUBI-TIER1-SECTION1-POLY-DEGREE-LIFT1`
   - Status: complete.
   - Raises integration-local expansion/backcheck caps for higher-degree monomials produced by bounded polynomial powers.
   - Keeps term/node caps and exact original-integrand backcheck.

3. `RUBI-TIER1-POLY-BYPARTS-FEEDER1`
   - Status: complete.
   - Feeds bounded expanded polynomial factors into the existing integration-by-parts solver.
   - Keeps public strategy as `integration-by-parts`.

4. `RUBI-TIER1-SECTION1-QUADRATIC-RECIPROCAL-POWER1`
   - Status: complete.
   - Adds a narrow repeated irreducible-quadratic reciprocal power case such as `1/(1+x^2)^2`.
   - Preserves inverse-trig precedence for power `1` and defers broader recurrence machinery.

5. `CALCULUS-INTEGRALS-EDITOR-SOURCE1`
   - Status: complete.
   - Makes Calculus integral screens edit integrands through the main editor and removes duplicate lower integrand editors.

6. `RUBI-TIER1-AFFINE-POWER1`
   - Status: complete.
   - Adds exact-rational affine powers `(m*x+n)^p` with bounded integer powers, `p=-1`, and selected negative integer powers.
   - Keeps public strategy/result metadata stable and relies on exact derivative backcheck.

7. Current exact-rational Tier 1 sequence
   - Status: complete.
   - `RUBI-TIER1-BINOMIAL-DERIVATIVE-SUB1` is complete.
   - `RUBI-TIER1-REPEATED-LINEAR-RATIONAL1` is complete.
   - `RUBI-TIER1-QUADRATIC-RECIPROCAL-NUMERATOR1` is complete.
   - `RUBI-TIER1-QUADRATIC-RECIPROCAL-POWER-LIFT1` is complete.
   - `RUBI-TIER1-RATIONAL-QUADRATIC-MIXED1` is complete.
   - `RUBI-TIER1-QUADRATIC-RECIPROCAL-NONSQUARE1` is complete.
   - `RUBI-TIER1-QUADRATIC-COMPLETE-SQUARE1` is complete.
   - `RUBI-TIER1-QUADRATIC-NUMERATOR-POWER-LIFT1` is complete.
   - `RUBI-TIER1-MULTI-QUADRATIC-PARTIAL-FRACTIONS1` is complete.
   - `RUBI-TIER1-AFFINE-LOG-BYPARTS1` is complete.
   - `RUBI-TIER1-RECIPROCAL-BINOMIAL-SUB1` is complete.
   - `CALCULUS-ANSWER-PREVIEW-AUTOSIZE1` is complete as the final adjacent UI autosize fix.

8. Current perf plus balanced coverage sequence
   - Status: active.
   - `INTEGRATION-RATIONAL-PF-PERF-SPLIT-AUDIT0` is complete.
   - Next planned slice is `INTEGRATION-RATIONAL-PF-BACKCHECK-CACHE1`, targeting scoped backcheck normalization/cache work for nonsquare and completed-square repeated-quadratic forms.
   - Remaining planned slices: `RUBI-TIER1-LINEAR-QUADRATIC-PF-LIFT2`, `RUBI-TIER1-QUADRATIC-NUMERATOR-GENERAL1`, `RUBI-TIER1-TRIG-AFFINE-BASIC1`, and `RUBI-TIER1-EXP-AFFINE-BASIC1`.

9. Later Rubi tiers
   - Deferred until Section 1 slices have stable verification and stop behavior.
   - Lazy tier imports, Rubi provenance metadata, and visible rule-family labels remain separate decisions.

## Standing Stop Rules

- Fractional or symbolic powers of non-affine polynomials stop unless a named prerequisite slice owns the domain/readback policy.
- Negative powers route through derivative-ratio or rational partial fractions when already supported; they are not expanded by Rubi Section 1 expansion.
- `Abs`, roots, logs, trig, exp, and other branch/transcendental heads do not get solved around by algebraic expansion.
- Over-limit expansions stop without Compute Engine fallback changes or hidden source-mirror delegation.
