# AREA-MULTIVAR0

status: complete  
mode: full synthesis  
date: 2026-05-23  
predecessor: `POLY-ELIM1` / `multivariable-variable-policy-roadmap`  
primary_agent: codex  
primary_agent_model: gpt-5.5

## Purpose

`AREA-MULTIVAR0` studies variable semantics and multivariable readiness across Calcwiz plus FriCAS, SymPy, Maxima, SageMath, Giac/XCAS, SymEngine, and GeoGebra as static context sources.

The study exists because bivariate elimination, polynomial systems, variable memory, and multi-symbol Equation behavior cannot be safely added until Calcwiz can distinguish solve targets, stored numeric values, symbolic parameters, active variables, bound variables, reserved constants, and unsupported symbols.

## Decision

Recommended next move: `VARIABLE-CORE1`.

The evidence says Calcwiz should not jump directly to `EQUATION-TARGET1`, `VARIABLE-MEMORY1`, or `POLY-ELIM2`. The first safe implementation slice is a shared internal symbol-discovery and variable-role core. That gives Equation, Calculate, Calculus, Table, future variable memory, and future elimination work one vocabulary before any visible target-selection or stored-value behavior is added.

## Boundaries

- No product math behavior changes.
- No variable memory implementation.
- No solve-target UI.
- No multivariable solving.
- No bivariate resultants, Grobner bases, polynomial-system solving, or graphing.
- No source mirror execution, build, dependency install, or copied external source code.
- Stored variables remain distinct from solve targets.

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
