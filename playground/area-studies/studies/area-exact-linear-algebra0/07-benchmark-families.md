# AREA-EXACT-LINEAR-ALGEBRA0 Benchmark Families

## Family

Small exact rational determinant cases.

## Source

Calcwiz synthetic cases plus SymPy/SymEngine/SageMath exact matrix evidence.

## Intended Use

Verify exact determinant behavior, zero determinant stops, and coefficient-growth caps.

## Boundary Notes

Keep matrices small. Do not treat benchmarks as product UI tests.

## Adoption Status

Candidate for `EXACT-LINEAR-ALGEBRA1`.

## Family

RREF and rank with rational pivots.

## Source

SymPy fraction-free RREF, SymEngine reduced row echelon, Giac/XCAS RREF, and Maxima echelon/rank behavior.

## Intended Use

Prove pivot metadata, rank facts, and denominator growth stops.

## Boundary Notes

No approximate pivots. No floating epsilon.

## Adoption Status

Candidate for `EXACT-LINEAR-ALGEBRA1`.

## Family

Square exact linear systems.

## Source

Calcwiz numeric solve tests, FriCAS linear-system packages, Maxima linsolve, SageMath matrix solve workflows.

## Intended Use

Verify exact solving for small square systems and stops for singular/inconsistent cases.

## Boundary Notes

Underdetermined systems should stop or return typed metadata; broad parametric solve is not required in the first implementation.

## Adoption Status

Candidate for `EXACT-LINEAR-ALGEBRA1`.

## Family

Elimination-prep matrices.

## Source

AREA-POLY-ELIM0 benchmark families and source evidence from Grobner/resultant systems.

## Intended Use

Ensure exact linear algebra returns the pivot/rank facts polynomial elimination will later need.

## Boundary Notes

No Grobner or resultant implementation in this milestone.

## Adoption Status

Future `POLY-ELIM1` dependency.
