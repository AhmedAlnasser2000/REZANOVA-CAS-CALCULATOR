# AREA-EXACT-LINEAR-ALGEBRA0 Pattern Extraction

## Pattern

Exact matrix core separate from numeric Matrix mode.

## Why It Matters

Floating pivots and epsilon singularity checks are fine for current product numeric behavior, but they cannot support exact proof, polynomial elimination, or exact solving.

## Smallest Bounded Translation

Add a small internal exact rational matrix type and operations under strict caps.

## Required Prerequisites

- current `ExactScalar` helpers
- result envelopes
- assumption facts
- numeric Matrix core remains separate

## Risks

If exact and numeric matrices share one loose API, behavior can drift silently.

## Pattern

Fraction-free row operations.

## Why It Matters

Naive rational Gaussian elimination can explode denominators. Fraction-free/Bareiss-style methods reduce intermediate growth for exact integer/rational input.

## Smallest Bounded Translation

Implement determinant and row-reduction readiness through a tiny fraction-free path where possible, falling back to rational normalization only under caps.

## Required Prerequisites

- coefficient size limits
- denominator size limits
- pivot metadata
- controlled singular/underdetermined stops

## Risks

Without growth caps, small inputs can create huge exact coefficients.

## Pattern

Pivots and rank are metadata, not just numbers.

## Why It Matters

Elimination and solving need pivot columns, rank, singularity, and consistency facts, not only final matrices.

## Smallest Bounded Translation

Return typed exact linear algebra envelopes with value, pivots, rank, stop reason, and trust facts.

## Required Prerequisites

- assumption/trust facts
- exact scalar normalization
- result-envelope compatibility

## Risks

If metadata is omitted, later `POLY-ELIM1` will need to rediscover it locally.
