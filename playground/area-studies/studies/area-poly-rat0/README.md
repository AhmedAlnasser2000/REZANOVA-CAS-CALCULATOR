# AREA-POLY-RAT0

status: complete  
mode: full synthesis  
date: 2026-05-21  
primary_agent: codex  
primary_agent_model: gpt-5.5

## Purpose

`AREA-POLY-RAT0` compares polynomial and rational-function substrates across Calcwiz and the static source-context mirrors.

The study exists to decide whether Calcwiz should proceed to bounded rational integration, add another polynomial/rational substrate milestone first, or defer the area.

## Decision

Recommended next move: `INT-RAT1`.

The current `POLY-RAT-CORE0` substrate is enough for a narrow rational-integration slice over one-variable exact rational functions whose proper denominator decomposes into distinct rational linear factors. The implementation should stop on repeated factors, irreducible quadratics, unsupported factorization, multivariable input, decimal coefficients, or degree/cap overflow.

## Boundaries

- No source mirror execution.
- No copied external code.
- No product dependency on source mirrors.
- No stable math behavior change in this study.
- No Grobner, resultant, broad factorization, exact linear algebra, or full partial-fraction engine adoption.

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
