# AREA-POLY-ELIM0

status: complete  
mode: full synthesis  
date: 2026-05-23  
predecessor: `AREA-POLY-RAT1` / `ASSUMPTIONS-READBACK0`  
primary_agent: codex  
primary_agent_model: gpt-5.5

## Purpose

`AREA-POLY-ELIM0` studies polynomial elimination, resultants, Grobner bases, and multivariate polynomial-system solving across Calcwiz plus FriCAS, SymPy, Maxima, SageMath, Giac/XCAS, SymEngine, and GeoGebra as static context sources.

The study exists to decide what Calcwiz must build before any implementation slice such as `POLY-ELIM1`. It is not a product feature milestone.

## Decision

Recommended next move: `AREA-EXACT-LINEAR-ALGEBRA0`.

The evidence says Calcwiz should not jump directly to `POLY-ELIM1`. The current polynomial/rational substrate is strong for bounded one-variable rational work, but elimination depends on exact coefficient-domain discipline, exact row-reduction style operations, term-order-aware multivariate polynomial representation, and matrix-style algorithms that Calcwiz has not yet studied as reusable exact infrastructure.

## Boundaries

- No product math behavior changes.
- No resultants, Grobner bases, elimination, or multivariate solving.
- No graphing work.
- No source mirror execution, build, dependency install, or submodule recursion.
- No copied external source code.
- No feature-parity claim with any mirror.
- Future implementation names start at `1`; this `0` milestone is study/readiness only.

## Files

- `00-scope.md`
- `01-source-notes.md`
- `02-cross-source-comparison.md`
- `03-pattern-extraction.md`
- `04-calcwiz-fit-evaluation.md`
- `05-synthesis.md`
- `06-calcwiz-native-proposal.md`
- `07-benchmark-families.md`
- `08-risks.md`
