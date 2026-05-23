# AREA-EXACT-LINEAR-ALGEBRA0 Cross-Source Comparison

## Compared Sources

Compared:

- Calcwiz
- FriCAS
- SymPy
- Maxima
- SageMath
- Giac/XCAS
- SymEngine
- GeoGebra

## Shared Patterns

The stronger systems separate exact linear algebra from floating-point numeric matrix work.

Common patterns:

- coefficient domain is explicit
- exact row reduction and determinant algorithms avoid floating pivot thresholds
- fraction-free methods are used to control rational growth
- matrix algorithms return rank/pivot/singularity information
- exact matrix results are prerequisites for polynomial-system and elimination work
- product surfaces expose only a subset of the underlying algebra

## Divergences

Calcwiz:

- numeric Matrix/Vector product cores exist
- exact scalar helpers exist in one-variable algebra
- exact matrix/vector core does not exist

FriCAS:

- domain/category-driven exact matrices and linear systems

SymPy:

- `DomainMatrix` style exact matrix boundary and fraction-free routines

Maxima:

- broad user-facing matrix CAS commands

SageMath:

- matrix implementations split by ring/domain and representation

Giac/XCAS:

- calculator-visible linear algebra backed by engine routines

SymEngine:

- compact core matrix classes and exact/fraction-free algorithms

GeoGebra:

- workflow evidence, Giac-backed CAS depth

## Calcwiz Relevance

Calcwiz should add a small internal exact matrix core before product exact Matrix mode or polynomial elimination. The exact core should use current rational scalar support first, with strict caps and stop reasons for growth.

## Non-Adoption Notes

Do not inherit:

- FriCAS's full domain runtime
- SymPy's whole matrix/domain API
- Maxima's broad symbolic matrix command surface
- SageMath's backend orchestration identity
- Giac/XCAS's full calculator CAS scope
- SymEngine-only core without Calcwiz result envelopes
- GeoGebra's graph-first workflow sequencing
