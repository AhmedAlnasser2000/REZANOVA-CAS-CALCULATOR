# AREA-EXACT-LINEAR-ALGEBRA0 Source Notes

## Source

Calcwiz stable code.

## Relevant Capability

Calcwiz has numeric `matrix-core` and `vector-core` modules that own product Matrix/Vector arithmetic, determinant, inverse, and numeric linear solve. It also has `ExactScalar` rational helpers in `polynomial-core`, but exact matrix/vector values and exact row operations do not exist.

## Enabling Pattern

The reusable-core split is already correct: numeric product behavior is separated from product adapters, and exact scalar helpers are already shared by algebra substrates.

## Cost

Current numeric operations use floating-point pivots and cannot support exact proof, denominator constraints, or coefficient growth accounting.

## Calcwiz Translation Hint

Add an internal exact matrix core sibling rather than widening the numeric product core or product Matrix UI first.

## Source

FriCAS static mirror.

## Relevant Capability

FriCAS uses matrix/vector domains, exact coefficient domains, reduced systems, and linear-system packages across algebra and differential equation code. Exact linear algebra is a normal substrate beneath higher algebra.

## Enabling Pattern

Typed domains make coefficient rings explicit, so matrix algorithms know what kind of arithmetic they are performing.

## Cost

FriCAS's full domain/category architecture is too heavy for Calcwiz.

## Calcwiz Translation Hint

Translate the coefficient-domain gate and exact-system boundary, not the full domain runtime.

## Source

SymPy static mirror.

## Relevant Capability

SymPy uses `DomainMatrix` and dense/sparse domain matrix routines for exact row reduction, fraction-free RREF, Bareiss determinant, inverse, and solve-style operations.

## Enabling Pattern

Exact linear algebra is organized around explicit domains and algorithms that distinguish field operations from fraction-free integer-domain work.

## Cost

The full `DomainMatrix` ecosystem is broad and not appropriate as a Calcwiz API target.

## Calcwiz Translation Hint

Borrow the domain-aware matrix boundary and fraction-free algorithm preference for small exact rational/integer cases.

## Source

Maxima static mirror.

## Relevant Capability

Maxima exposes classic matrix functions such as determinant, inverse, rank, echelon/triangular forms, and linear-system solving in a broad CAS environment.

## Enabling Pattern

Linear algebra is user-visible and solver-adjacent, but it remains deeply tied to simplification and symbolic expression behavior.

## Cost

Calcwiz should not inherit broad symbolic matrix behavior or global simplification coupling.

## Calcwiz Translation Hint

Keep the first slice internal and exact-core-owned before product Matrix or Equation mode exposes exact solving.

## Source

SageMath static mirror.

## Relevant Capability

SageMath has dedicated matrix modules by coefficient domain, including rational, integer, polynomial, modular, dense, and sparse variants.

## Enabling Pattern

Matrix behavior is organized by parent/ring/domain and representation. That separation keeps exact and numeric behavior from colliding.

## Cost

Sage's multi-backend/platform model is too broad for Calcwiz.

## Calcwiz Translation Hint

Use separate exact and numeric matrix types; avoid one matrix type with silent mode switching.

## Source

Giac/XCAS static mirror.

## Relevant Capability

Giac/XCAS exposes calculator-oriented linear algebra commands such as RREF, rank, inverse, determinant, and linear solve, and it uses matrix reduction routines inside algebraic algorithms.

## Enabling Pattern

Calculator-visible exact linear algebra is valuable, but it depends on substantial engine-level support.

## Cost

The command surface is much wider than Calcwiz should expose immediately.

## Calcwiz Translation Hint

Implement core first, product command later.

## Source

SymEngine static mirror.

## Relevant Capability

SymEngine includes dense/sparse matrix classes, rank, reduced row echelon form, inverse variants, and fraction-free LU-style routines.

## Enabling Pattern

Fast core representation plus exact algorithms can be small and useful when the surface is restrained.

## Cost

Core algorithms alone do not answer Calcwiz's result readback, assumption facts, or product-mode expectations.

## Calcwiz Translation Hint

Use SymEngine as evidence that a compact exact matrix core is feasible, but keep result envelopes Calcwiz-native.

## Source

GeoGebra static mirror.

## Relevant Capability

GeoGebra is mainly workflow evidence for CAS and geometry-facing linear algebra. Its CAS depth largely comes through Giac.

## Enabling Pattern

Users benefit from visible exact linear algebra only when the UI makes domain and result meaning clear.

## Cost

GeoGebra's graph/geometry-first product sequencing is not Calcwiz's near-term path.

## Calcwiz Translation Hint

Do not pull graphing or broad geometry workflows into this milestone.
