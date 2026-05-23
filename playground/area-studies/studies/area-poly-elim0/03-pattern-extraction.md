# AREA-POLY-ELIM0 Pattern Extraction

## Pattern

Explicit polynomial ring descriptor.

## Why It Matters

Elimination algorithms need to know variables, coefficient domain, degree/term caps, and monomial order. Generic expression trees are not enough.

## Smallest Bounded Translation

Define an internal multivariate polynomial descriptor before any algorithm:

- variables
- coefficient kind
- monomial order
- degree cap
- term cap
- allowed operations

## Required Prerequisites

- exact rational scalar policy
- term/monomial representation
- expression-to-polynomial extraction gate

## Risks

Too broad a descriptor can turn into a hidden CAS platform. Too narrow a descriptor can make every later algorithm incompatible.

## Pattern

Exact linear algebra under algebra algorithms.

## Why It Matters

Grobner conversion, polynomial-system decomposition, and some resultant workflows lean on exact row-reduction or matrix-like operations over coefficient domains.

## Smallest Bounded Translation

Study exact rational matrix/vector operations first through `AREA-EXACT-LINEAR-ALGEBRA0`, then decide whether a tiny exact row-reduction substrate is enough for elimination prototypes.

## Required Prerequisites

- exact scalar readiness
- reusable exact matrix model
- fraction-free or rational row-reduction policy
- stop reasons for coefficient blowup

## Risks

Jumping to elimination before exact linear algebra risks duplicating linear algebra inside polynomial code.

## Pattern

Elimination result envelopes carry facts.

## Why It Matters

Resultants and elimination can lose denominator exclusions, introduce extraneous roots, or require candidate validation. Calcwiz already built scoped assumption facts; elimination must use them.

## Smallest Bounded Translation

Future `POLY-ELIM1` should return typed envelopes with:

- generated polynomial facts
- candidate-rejection facts
- preserved denominator/domain facts
- order/cap metadata
- proof/trust label

## Required Prerequisites

- `ASSUMPTIONS-CORE0`
- `ASSUMPTIONS-ADOPT1`
- readback policy for facts

## Risks

Without facts, elimination results will look exact while silently dropping assumptions.
