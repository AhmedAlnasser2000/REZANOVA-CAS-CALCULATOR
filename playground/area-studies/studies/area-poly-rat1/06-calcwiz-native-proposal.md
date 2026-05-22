# AREA-POLY-RAT1 Calcwiz-Native Proposal

## Proposal

Plan `POLY-RAT-CORE1` as the next implementation milestone.

Goal:

> strengthen polynomial/rational substrate readiness for repeated factors, irreducible quadratics, square-free/factor multiplicity, and clearer rational stops before widening rational integration.

## Stable Owner

- `src/lib/algebra/polynomial-core.ts` remains the exact polynomial primitive owner.
- `src/lib/algebra/rational-function-core.ts` remains rational normalization and partial-fraction readiness owner.
- `src/lib/symbolic-engine/integration.ts` may consume new facts only in a later `INT-RAT2`.
- `.memory/research/readiness/*` records readiness; `playground/area-studies/*` records multi-source research.

## Playground Path

No Playground runner is required for `POLY-RAT-CORE1`.

If the exact shape of quadratic/repeated decomposition becomes uncertain, add a Playground-only design probe that consumes stable rational-function fixtures and returns typed decomposition envelopes. It must not execute source mirrors and must not change product behavior.

## Acceptance Criteria

For `POLY-RAT-CORE1`:

- Repeated rational linear factors are represented with multiplicity facts.
- Irreducible quadratic factors are classified over the real/exact rational policy.
- Square-free/factor readiness is available under caps.
- Rational-function stop reasons distinguish unsupported factor families.
- Existing `INT-RAT1` distinct-linear behavior remains unchanged.
- No visible calculus widening occurs until `INT-RAT2`.

## Non-Goals

- No broad factorization engine.
- No multivariate polynomial algebra.
- No resultants or Grobner/elimination.
- No exact linear algebra.
- No source-mirror execution or copied code.
- No public claim of full rational integration.
