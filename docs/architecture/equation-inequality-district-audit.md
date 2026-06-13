# Equation Inequality District Audit

Status: audit note

Purpose: map the current `equation-inequality` district before any structural split. This note is audit-only; it does not authorize new inequality families or behavior changes.

## Current Public Surface

- `isTopLevelInequalityLatex(latex)`: detects top-level ordered relations after input canonicalization.
- `inequalityAnswerModeGuidanceOutcome(input)`: returns guidance for unsupported inequality answer modes.
- `solveBoundedLinearInequality(input)`: solves the currently supported real inequality families and returns the Equation display outcome.

The only current production consumer is Equation mode. The current route keeps ordered inequalities real-valued even when Complex intent is enabled.

## Internal Responsibility Map

- Relation and target parsing: top-level relation extraction, fallback relation detection, target resolution, relation reversal, and variable collection.
- Finite real solving: polynomial/rational sign-chart paths, exact real roots, repeated-root handling, denominator exclusions, and exact interval set assembly.
- Numeric shell peeling: target-free additive and multiplicative shells, direction flipping for negative factors, and detail-line narration.
- Wrapped finite families: absolute value, radical, logarithmic, and exponential inequality reduction with domain supplements.
- Periodic trig families: direct affine trig inequalities, abs-affine preimages, nested representable trig inequalities, tangent singularities, period facts, exact/decimal/both threshold readback, and x-family flattening.
- Outcome assembly: exact latex, approx text, `Valid when` supplements, proof/detail sections, answer-domain metadata, and unsupported-family guidance.

## Future Split Candidates

- `inequality/relation.ts`: top-level relation parsing, canonicalization fallback, target resolution, and relation helpers.
- `inequality/finite.ts`: polynomial/rational finite sets, sign charts, roots, denominator exclusions, and finite result combination.
- `inequality/shells.ts`: target-free additive/multiplicative shell peeling and route detail text.
- `inequality/wrappers.ts`: absolute value, radical, log, and exp reductions.
- `inequality/periodic-trig.ts`: trig threshold ranges, periodic set math, abs-affine preimages, tangent singularities, and periodic readback formatting.
- `inequality/outcome.ts`: success/error outcome assembly, proof details, supplements, and answer-mode guidance.

## High-Risk Contracts

- Relation normalization must continue to accept typed, pasted, copied, and replayed forms such as `<=`, `< =`, `=<`, `≤`, `>=`, and `≥`.
- Exact-only inequality solving must not silently become Approximate inequality sampling.
- `Approximate` and `Isolate` answer modes must remain guidance errors for inequalities.
- Complex intent must not turn ordered inequalities into complex-domain solving; they stay on the real line with an explicit supplement.
- Restrictions stay in `Valid when` / exact supplements, while proof/detail cards remain route narration.
- Periodic inequality readback must remain x-family readback for abs-affine preimages, not hidden carrier-family readback.

## Test Gates

- `npm run test:unit -- src/lib/equation/equation-inequality.test.ts`
- `npm run test:unit -- src/lib/equation/guarded-solve.test.ts src/lib/equation/shared-solve.test.ts`
- `npx tsc -b --pretty false`
- `npm run test:file-sizes`

## Stop Rules

- Do not add new inequality families in the district split.
- Do not implement `INEQUALITY-STABILITY1` here; use that later for normalization/replay/regression hardening.
- Do not change Equation replay, history, OOE, display policy, or answer-mode semantics.
- Do not move proof/detail wording into OOE or runtime policy.
