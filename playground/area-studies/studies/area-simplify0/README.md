# AREA-SIMPLIFY0

status: complete  
mode: full synthesis  
date: 2026-05-22  
predecessor: `POLY-RAT-CORE1`  
primary_agent: codex  
primary_agent_model: gpt-5.5

## Purpose

`AREA-SIMPLIFY0` studies normal-form, readback, and equivalence policy before `INT-RAT2` decides whether to expose repeated-linear and irreducible-quadratic rational integration.

The study compares Calcwiz shipped behavior with FriCAS, SymPy, Maxima, SageMath, Giac/XCAS, SymEngine, and GeoGebra as static evidence sources. It does not execute mirrors or copy source.

## Decision

Recommended next move: `SIMPLIFY-CORE0`.

The blocker is not only rational integration wording. Calcwiz needs a small shared policy layer for canonical vs readable forms, equivalence checks, and preserved denominator/domain facts so future rational, calculus, and algebra results do not become locally inconsistent.

## Boundaries

- No stable math behavior changes.
- No source mirror execution.
- No copied external code.
- No product dependency on source mirrors.
- No Labs runner changes.
- No broad simplifier or feature-parity promise.

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
