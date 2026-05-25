# Variable Values And Substitution Roadmap

status: active implementation roadmap
created: 2026-05-24
source_context: post-`EQUATION-PARAM15` planning
related_roadmaps:
- `.memory/research/roadmaps/multivariable-variable-policy-roadmap.md`
- `.memory/research/roadmaps/equation-parameterized-solving-roadmap.md`
- `.memory/research/roadmaps/poly-rat-native-roadmap.md`
primary_agent: codex
primary_agent_model: gpt-5.5

## Purpose

This roadmap owns user-stored variable values and substitution policy.

It is separate from the `EQUATION-PARAM*` sequence because stored values are not symbolic parameters, and it is separate from future named-string variables because one stored numeric value attached to `x` is a different product feature from accepting `hello` as one algebraic symbol.

## Locked Principles

- Stored values are explicit user-managed numeric values, not unknowns and not symbolic assumptions.
- Solve targets are never replaced by stored values.
- Symbolic parameters remain symbolic unless a later explicit mode action chooses stored-value substitution.
- Calculate may use stored values automatically only when the result clearly shows what was substituted.
- Equation symbolic solve does not use stored values in `VARIABLE-MEMORY1`.
- History replay must be reproducible: entries that used stored values replay with the original value snapshot.
- Identifier policy remains conservative: case-sensitive single-symbol variables only for the first stored-value slice.
- `Ans` remains a special runtime value and is not user-managed variable memory.
- Graphing remains deferred and is not part of this roadmap.

## Roadmap Sequence

### 1. `VARIABLE-MEMORY1` - Explicit Stored Numeric Variables

Status: implemented locally on 2026-05-24.

Goal:

- add a visible stored-variable model and use it in standard Calculate evaluation without confusing stored values with solve targets or parameters.

Expected behavior:

- users can set, update, inspect, clear, and clear all stored variables in a dedicated Variables side panel
- stored names are case-sensitive single-symbol variables such as `x`, `z`, `K`, and `k`
- stored values are finite real numeric values only
- Calculate standard `evaluate` substitutes stored values automatically and visibly
- result details list used values, for example `Stored Values: a=4, k=-2`
- Calculate history entries capture the used-value snapshot and replay with that snapshot
- Equation symbolic solve ignores stored values and preserves selected-target parameter semantics

What shipped:

- added a stored-variable model for case-sensitive single-letter finite real numeric values
- added a dedicated Variables side panel with set/update, edit, clear, and clear-all controls
- wired standard Calculate `evaluate` to substitute stored values visibly through structured MathJSON replacement
- added `Stored Values` result details and stored-value snapshots on Calculate history entries
- made Calculate replay use the original stored-value snapshot instead of the current variable memory
- preserved Equation symbolic target/parameter semantics with no stored-value substitution

Non-goals:

- no Equation stored-value substitution
- no Table or Calculus stored-value adoption
- no symbolic stored values
- no named-string variables
- no graphing, `POLY-ELIM2`, or broad multivariable solving

### 2. `VARIABLE-MEMORY2` - Mode Adoption Policy

Status: implemented locally on 2026-05-25.

Goal:

- decide and implement explicit stored-value use for Equation numeric solve, Table parameters, and Calculus non-bound parameters.

Expected behavior:

- Equation symbolic still requires an explicit action before using stored values
- numeric-only workflows may use stored values when needed and visible
- active and bound variables are never replaced
- details and history identify the stored-value policy used

What shipped:

- structured stored-value substitution now accepts protected variable names
- Table substitutes stored non-`x` parameters in primary and secondary expressions
- Basic/Advanced Calculus substitutes non-bound parameters while protecting active variables, partial derivative variables, and ODE `x/y`
- Equation numeric solve substitutes stored non-target parameters only; Equation symbolic remains untouched
- stored-value snapshots now support replay for adopted Table, Advanced Calc, and Equation numeric runs

Non-goals:

- no Equation symbolic substitution
- no symbolic stored values
- no named-string variables
- no broad multivariable solving, graphing, or `POLY-ELIM2`

### 3. `VARIABLE-READBACK1` - Variable Use Readback Polish

Status: future implementation.

Goal:

- make stored values, symbolic parameters, solve targets, active variables, and bound variables easy to understand in result details and errors.

### 4. `EDITOR-VARIABLE-HINTS1` - Semantic Variable Hints

Status: future visible UX.

Goal:

- color or annotate reserved functions, reserved constants, stored variables, solve targets, and ambiguous adjacent-letter input using `VARIABLE-CORE1` classifications.

### 5. `NAMED-VARIABLES1` - Explicit Multi-Character Variable Policy

Status: future policy and implementation.

Goal:

- support coding-style named variables such as `hello` only after syntax, storage, reserved words, target selection, history, and readback are explicit.

## Recommended Next Move

Plan `VARIABLE-READBACK1` or `EDITOR-VARIABLE-HINTS1` after manual use of `VARIABLE-MEMORY2` confirms the expanded stored-value policy feels clear.

Reason:

- `VARIABLE-MEMORY2` deliberately keeps Equation symbolic untouched while widening numeric/table/calculus adoption.
- The next product risk is comprehension: users need clear readback and editor hints so stored values, solve targets, active variables, bound variables, and symbolic parameters do not blur together.
