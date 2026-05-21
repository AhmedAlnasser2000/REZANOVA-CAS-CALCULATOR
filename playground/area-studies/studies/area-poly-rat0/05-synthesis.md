# AREA-POLY-RAT0 Synthesis

## Findings

Calcwiz's current polynomial/rational substrate is narrow but mature enough for one bounded rational-integration adoption slice.

The cross-engine evidence says power comes less from isolated formulas and more from representation discipline:

- typed coefficient domains
- expression-to-polynomial conversion gates
- rational-function normalization
- preserved denominator constraints
- factorization readiness separated from calculus adoption
- explicit escalation tiers for square-free, resultants, Grobner, and exact linear algebra

## What To Carry Forward

- Keep polynomial/rational operations in shared algebra cores.
- Require `rational-function-core` normalization before rational integration.
- Use derivative verification before presenting exact antiderivatives as trusted.
- Preserve denominator exclusions and real-domain safety notes.
- Treat broader algebra as future area studies, not hidden helper code.

## What Not To Inherit

- Full FriCAS-style domain/category architecture.
- SageMath-scale platform orchestration.
- SymPy/Maxima broad rewrite promises without equivalent stop reasons.
- Giac/XCAS feature parity pressure.
- Any direct source-mirror code or runtime dependency.

## Capability Boundary

`INT-RAT1` should be a bounded exact integration milestone, not a broad rational integration engine.

Allowed first slice:

- one variable
- exact rational coefficients
- normalized rational functions
- polynomial division into polynomial plus proper remainder
- distinct rational linear denominator factors
- derivative-backed verification

Deferred:

- repeated factors
- irreducible quadratic partial fractions
- square-free factorization
- resultants
- Grobner/elimination
- multivariable rational functions
- exact linear algebra

## Decision

Recommended next move: `INT-RAT1`.

Choose `INT-RAT1` now because current `POLY-RAT-CORE0` readiness is enough for a meaningful, honest, bounded rational-integration slice. Do not implement `POLY-RAT-CORE1` first unless `INT-RAT1` planning discovers that repeated factors or irreducible quadratic factors are required for the first public win.
