# AREA-EXACT-LINEAR-ALGEBRA0

- status: complete
- mode: full synthesis
- date: 2026-05-23
- predecessor: `AREA-POLY-ELIM0`
- primary_agent: codex
- primary_agent_model: gpt-5.5

## Purpose

`AREA-EXACT-LINEAR-ALGEBRA0` studies the exact scalar, matrix, and vector foundations Calcwiz needs before polynomial elimination, resultants, Grobner bases, product-facing exact Matrix work, or symbolic linear-system solving.

This is a readiness study only. It does not add exact matrix behavior.

## Decision

Recommended next move: `EXACT-LINEAR-ALGEBRA1`.

The study finds that Calcwiz can start with a bounded internal exact rational matrix core using the existing number-backed `ExactScalar` shape, provided the first implementation includes strict matrix size, coefficient-growth, denominator-growth, and unsupported-domain stops. `EXACT-SCALAR1` is not required before the first tiny exact-linear-algebra slice, but stronger bigint rational scalars remain a likely later milestone if coefficient growth becomes pressure.

## Boundaries

- No exact matrix engine in this milestone.
- No Matrix/Vector product behavior changes.
- No solver, equation, polynomial-elimination, Grobner, resultant, UI, Labs, or graphing changes.
- No source mirror execution, build, dependency install, or submodule recursion.
- No copied external source code.
- Future implementation names start at `1`.

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
