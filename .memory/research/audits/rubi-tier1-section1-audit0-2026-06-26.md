# RUBI-TIER1-SECTION1-AUDIT0

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5-codex
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5-codex
- verified_by_agent: codex
- verified_by_agent_model: gpt-5-codex
- attribution_basis: live

## Gate

- label: backend
- status: audit only

## Scope

This audit maps Rubi IntegrationRules Section 1, `Algebraic functions`, against the current Calcwiz symbolic integration lane after `INTEGRATION-FORM-CLASSIFIER1`.

The goal is to pick a first value-adding Rubi tier-1 implementation slice without duplicating existing direct, affine-linear, substitution, derivative-ratio, partial-fraction, or integration-by-parts coverage.

## Sources

- Primary rule corpus: `playground/sources/mirrors/integration-rules/`
- Registered metadata: `playground/sources/metadata/integration-rules.yaml`
- Captured upstream commit: `69bc5176fbf1599f10aa2e00803767969ff1ceed`
- Section inspected: `PdfFiles/1 Algebraic functions/`
- Existing Calcwiz integration files inspected:
  - `src/lib/symbolic-engine/integration/dispatch.ts`
  - `src/lib/symbolic-engine/integration/classifier.ts`
  - `src/lib/symbolic-engine/integration/rules.ts`
  - `src/lib/symbolic-engine/integration/rational.ts`
  - `src/lib/calculus/engine/antiderivative-rules.ts`
  - `src/lib/symbolic-engine/primitives/expansion/expansion.ts`

## Boundary

- No production integration rules were added.
- No Rubi, SymPy, or mirror code was imported, executed, or copied into stable `src`.
- Source-mirror reads were static PDF/text inspection only.
- No public `CalculusIntegrationStrategy`, `IntegrationCandidateMetadata`, Display, History, OOE, Tauri, or workspace result shape was changed.
- This audit does not approve all-at-once Rubi parity.

## Section 1 Map

Section 1 contains 49 PDF files:

- `1.1 Binomial products`: linear, quadratic, general, and improper binomial products.
- `1.2 Trinomial products`: quadratic, quartic, general, and improper trinomial products.
- `1.3 Miscellaneous`: `P(x)^p`, `P(x) Q(x)^p`, miscellaneous algebraic functions, and normalizing algebraic functions.

The observed rule styles are not uniform. They include:

- direct affine and polynomial power cases,
- derivative-factor substitution cases,
- algebraic expansion into sums or products,
- polynomial GCD/factor rewrites,
- rational partial-fraction-friendly rewrites,
- binomial/trinomial recurrences,
- discriminant-sensitive quadratic-power formulas,
- piecewise-constant extraction and branch-sensitive normalization.

## Current Calcwiz Coverage

Calcwiz already covers these families before any Rubi slice:

- Constants, sums, numeric constant multiples, `x^n`, affine powers, affine reciprocal logs, `e^(affine)`, `sin(affine)`, and `cos(affine)` through `direct-rule`.
- Derivative-factor substitution for common outers including powers, square roots, reciprocals, exp, log, sine, and cosine when the remaining product is proportional to the inner derivative.
- Logarithmic derivative rational forms through `derivative-ratio`.
- Exact rational functions through polynomial division and partial fractions within the current rational-function frontier.
- Polynomial times exponential, trig, or log forms through bounded integration by parts.
- Branch-sensitive carriers such as `Abs` are intentionally stopped before route execution.

## Coverage Assessment

- `1.1.1.1 (a+b x)^m` is mostly already covered for numeric exponents by `direct-rule`.
- `1.1.1.2+` affine binomial products are only partially covered. Rational negative-integer cases may already fall to partial fractions, and special derivative-factor shapes may fall to substitution. General products and recurrence forms are not covered.
- `1.1.3.2 (c x)^m (a+b x^n)^p` has an important overlap with existing substitution when `m = n - 1`. Broader recurrence, improper, negative-`n`, or non-derivative-factor cases remain uncovered.
- `1.1.3.7 P(x) (a+b x^n)^p` and related polynomial-times-binomial families are strong candidates only when `p` is a positive integer and bounded expansion produces a polynomial the current direct integrator can consume.
- `1.2` trinomial powers are mostly uncovered except where bounded positive-integer expansion can reduce them to a polynomial, or where rational-function normalization already handles negative-integer cases.
- `1.3.1 P(x)^p` contains the clearest low-risk first gap: positive-integer polynomial powers can be expanded into sums and delegated to current polynomial/direct integration. Negative-integer and non-integer cases quickly need rational/factor/domain or branch prerequisites.
- `1.3.2 P(x) Q(x)^p` overlaps with positive-integer expansion, rational-function support, and future GCD/factor rewrite work. It should not be implemented as a broad algebraic normalizer in the first slice.
- `1.3.3` and `1.3.4` should stay deferred. They lean on broader algebraic normalization and branch-sensitive transformations.

## Recommended First Implementation Slice

Use `RUBI-TIER1-SECTION1-POLY-EXPAND1` as the first implementation milestone.

Approved target shape for that future slice:

- Internally detect bounded products and positive-integer powers of polynomial sums from Section 1.
- Reuse `expandMathJsonNode()` rather than creating a Rubi-local expander.
- After expansion, delegate to the existing direct polynomial integration path.
- Adopt the visible strategy as `direct-rule`; do not add a new public strategy name for expansion.
- Backcheck the antiderivative against the original unexpanded integrand.
- Keep all expansion evidence internal/test-facing.

Good first tests:

- `(x^2+1)^2`
- `(x+1)(x+2)`
- `(x+1)^2(x+2)`
- `(x^2+x+1)^2`
- `x(1+x^2)^3`
- A term-limit or power-limit stop that preserves the current unsupported behavior.

## Deferred Families

Defer these until a named prerequisite slice exists:

- fractional or symbolic powers of non-affine polynomials,
- binomial/trinomial recurrences,
- discriminant-sensitive quadratic-power formulas,
- improper binomial/trinomial normalization,
- GCD/factor rewrites beyond what the rational-function core already supports,
- branch-sensitive piecewise-constant extraction,
- public result metadata for Rubi rule provenance,
- lazy tier imports or Rubi-family route names.

## Decision

The next Rubi work should start by translating the safest Section 1 algebraic-expansion rule family into Calcwiz-native bounded mechanics. It should not start with recurrence-heavy Rubi coverage or branch-sensitive normalization.
