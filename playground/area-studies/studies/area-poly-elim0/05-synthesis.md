# AREA-POLY-ELIM0 Synthesis

## Findings

The study confirms that polynomial elimination is not a small extension of the current one-variable polynomial/rational core.

Calcwiz is strong enough to continue bounded rational work, but elimination needs a different foundation:

- multivariate polynomial representation
- monomial order policy
- exact coefficient domains
- exact matrix/row-reduction readiness
- candidate validation and assumption-fact propagation
- caps for degree, term growth, and coefficient growth

FriCAS, SymPy, SageMath, and Giac/XCAS all show that serious elimination sits on a layered algebra substrate. Maxima shows the classic CAS behavior expected by users, while SymEngine and GeoGebra clarify the representation/workflow boundaries. None of these suggest Calcwiz should bolt Grobner onto the current one-variable core.

## What To Carry Forward

- explicit polynomial-ring descriptors
- monomial order as a first-class algorithm input
- coefficient-domain gates before algorithm execution
- exact linear algebra as a likely prerequisite
- result envelopes that preserve assumption facts and candidate checks
- strict caps and honest stop reasons
- Playground-first prototypes for any future implementation

## What Not To Inherit

- full FriCAS category/domain runtime
- full SymPy `polys` public API breadth
- Maxima-style global assumption coupling
- SageMath multi-backend platform identity
- Giac/XCAS full calculator CAS command surface
- SymEngine-only representation without readback policy
- GeoGebra graph-first sequencing

## Capability Boundary

`AREA-POLY-ELIM0` remains study-only.

Future implementation should not start until Calcwiz can answer:

- what exact coefficient domain is accepted?
- what exact matrix operations are available?
- what monomial orders are allowed?
- what caps stop growth?
- what assumptions and candidate-validation facts survive?
- what result envelope explains the transformation?

## Decision

Recommended next move: `AREA-EXACT-LINEAR-ALGEBRA0`.

Reason: choosing `POLY-ELIM1` now would force polynomial-elimination code to invent exact linear algebra locally. `POLY-RAT2` would improve adjacent factorization, but it does not solve the exact matrix/row-reduction prerequisite. `ASSUMPTIONS2` can wait because `ASSUMPTIONS-CORE0`, `ASSUMPTIONS-ADOPT1`, and `ASSUMPTIONS-READBACK0` already provide a usable fact spine. `defer` is too passive because exact linear algebra is already a known blocker for multiple future areas.

Therefore the next useful move is an `AREA-EXACT-LINEAR-ALGEBRA0` study over exact scalar and exact linear-algebra prerequisites before `POLY-ELIM1`.
