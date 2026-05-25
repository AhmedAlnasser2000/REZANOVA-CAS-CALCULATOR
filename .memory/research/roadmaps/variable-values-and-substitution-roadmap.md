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

It is separate from the `EQUATION-PARAM*` sequence because stored values are not symbolic parameters. `NAMED-VARIABLES1` now adds explicit named-variable tokens for stored numeric values, but raw adjacent letters such as `hello` still mean multiplication rather than one algebraic symbol.

## Locked Principles

- Stored values are explicit user-managed numeric values, not unknowns and not symbolic assumptions.
- Solve targets are never replaced by stored values.
- Symbolic parameters remain symbolic unless a later explicit mode action chooses stored-value substitution.
- Calculate may use stored values automatically only when the result clearly shows what was substituted.
- Equation symbolic solve does not use stored values in `VARIABLE-MEMORY1`.
- History replay must be reproducible: entries that used stored values replay with the original value snapshot.
- Identifier policy is explicit: raw single-letter names remain supported, while multi-character stored names require `@name` or `var(name)`.
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
- no explicit named variables yet
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
- no explicit named variables yet
- no broad multivariable solving, graphing, or `POLY-ELIM2`

### 3. `VARIABLE-READBACK1` - Variable Use Readback Polish

Status: implemented locally on 2026-05-25.

Goal:

- make stored values, symbolic parameters, solve targets, active variables, and bound variables easy to understand in result details and errors.

What shipped:

- stored-value substitution reports protected stored names that appeared in the input
- adopted modes share concise `Stored Values` readback with used values and effective substituted input where helpful
- detailed-only `Variable Policy` notes explain protected variables such as table variables, bound calculus variables, and Equation solve targets
- Equation numeric no-root wording is scoped to the searched interval and substituted equation when stored values were used

Non-goals:

- no new substitution surfaces
- no Equation symbolic substitution
- no explicit named variables yet
- no solver behavior changes

### 4. `VARIABLE-MEMORY3` - Stored-Value Policy Completion

Status: implemented locally on 2026-05-25.

Goal:

- centralize stored-value mode policy, add ignored-value notes for symbolic surfaces, and close remaining numeric adoption gaps without changing Equation symbolic substitution.

What shipped:

- added a shared stored-value mode-policy helper for `apply`, `ignore`, and `unsupported` decisions
- migrated Calculate, Table, Advanced Calc, and Equation numeric substitution routing onto that shared policy vocabulary
- added detailed-only ignored-value notes for Calculate symbolic transforms and Equation symbolic solve when stored values match the input
- kept Equation symbolic solve, selected-target parameterized solving, and algebra transforms symbolic rather than substituting stored values
- closed the derivative-at-point substitution gap by protecting the derivative variable while substituting non-bound stored parameters without corrupting the evaluation wrapper
- strengthened Advanced Calc numeric IVP coverage so ODE `x/y` remain protected while safe non-bound numeric parameters substitute

Non-goals:

- no Equation symbolic substitution
- no symbolic stored values
- no explicit named variables yet
- no graphing, `POLY-ELIM2`, or broad multivariable solving

### 5. `EDITOR-VARIABLE-HINTS1` - Semantic Variable Hints

Status: implemented locally on 2026-05-25.

Goal:

- color or annotate reserved functions, reserved constants, stored variables, solve targets, and ambiguous adjacent-letter input using `VARIABLE-CORE1` classifications.

What shipped:

- added a shared variable-hint adapter over `VARIABLE-CORE1` classifications and stored variable memory
- added visible, accessible hint chips near the main Calculate/Equation editor and clear Table/Calculus/Advanced Calc workbench editors
- labels now distinguish stored values, stored-but-ignored Equation symbolic values, solve targets, symbolic parameters, active variables, bound variables, reserved functions/constants, ambiguous adjacent letters, and unsupported names
- kept parsing, solving, substitution, named-string variable policy, result origins, badges, and history behavior unchanged

Non-goals:

- no inline MathLive DOM token-styling hacks
- no named-string variable support
- no Equation symbolic substitution
- no algebraic isolation or broader solving

### 6. `VARIABLE-READBACK2` - Variable Boundary Guidance

Status: implemented locally on 2026-05-25.

Goal:

- make unsupported selected-target and variable-role boundaries clearer before adding algebraic isolation.

What shipped:

- improved selected-target boundary readback for equations where the chosen target would require unsupported symbolic root isolation
- `34x^3-z^2=25`, solve for `x`, now explains the cube-root isolation gap and suggests solving for `z` or using numeric interval solve for `x`
- preserved the generic unsupported exact-family wording for cases without a clearer target-choice hint, such as `z^3+a=0`
- kept adjacent-letter ambiguity, stored-value ignored policy, and solve-target detail surfaces product-facing and free of implementation milestone wording

Non-goals:

- no algebraic isolation
- no named-string variable support
- no Equation symbolic stored-value substitution
- no solver priority or result contract changes

### 7. `NAMED-VARIABLES1` - Explicit Multi-Character Variable Policy

Status: implemented locally on 2026-05-25.

Goal:

- support coding-style named variables without changing raw adjacent-letter multiplication.

What shipped:

- explicit named-variable syntax through `@name` and `var(name)`
- normalization to one internal named-variable token rendered as upright math text
- Variables panel support for multi-character stored numeric variables only when entered explicitly, for example `@mass` or `var(mass)`
- raw multi-letter input such as `hello` remains adjacent-letter multiplication and receives hint/readback guidance instead of silently becoming one variable
- existing stored-value substitution policies now apply to named variables in Calculate, Table, Calculus/Advanced Calc numeric-safe paths, and Equation numeric solve
- Equation symbolic solve still ignores stored named values so solve targets and symbolic parameters remain symbolic

Non-goals:

- no raw multi-letter variable parsing
- no Equation symbolic stored-value substitution
- no broad named-target symbolic solving
- no algebraic isolation, graphing, `POLY-ELIM2`, or source-mirror work

## Recommended Next Move

Pause `EQUATION-ALGEBRAIC-ISOLATION1` until the next product/core priority is chosen.

Reason:

- `VARIABLE-MEMORY1` through `VARIABLE-MEMORY3` now cover finite real stored values, visible safe numeric substitution, protected active/bound/target variables, snapshot replay, shared readback, and explicit ignored-value notes.
- `EDITOR-VARIABLE-HINTS1` now explains roles before execution, and `VARIABLE-READBACK2` explains the most important unsupported target-choice and variable-boundary cases after execution.
- `NAMED-VARIABLES1` now closes the first explicit named-variable step without changing raw adjacency.
- Equation symbolic substitution is still intentionally not adopted; it needs a separate policy decision because stored values must never override solve targets or symbolic parameters.
