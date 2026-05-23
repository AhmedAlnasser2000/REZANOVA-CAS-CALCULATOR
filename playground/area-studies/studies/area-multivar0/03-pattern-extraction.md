# AREA-MULTIVAR0 Pattern Extraction

## Pattern

Symbol discovery before execution.

## Why It Matters

Calcwiz cannot safely ask "solve for whom?" or substitute stored variables until it knows which identifiers are real symbols and which are reserved names, functions, UI labels, or bound variables.

## Smallest Bounded Translation

`VARIABLE-CORE1` should collect identifiers from supported parsed expressions/equations and return a small role-ready symbol set.

## Required Prerequisites

- parser/MathJSON inspection helpers
- reserved constant/function-name list
- mode-specific policy inputs

## Risks

Over-collecting names could misclassify functions or labels as variables.

## Pattern

Explicit target selection.

## Why It Matters

An equation such as `x+z=5` cannot honestly be solved without knowing whether the target is `x`, `z`, or a future unknown tuple.

## Smallest Bounded Translation

Keep target selection out of the first core, but make the core return enough metadata for `EQUATION-TARGET1`.

## Required Prerequisites

- role model
- typed target metadata for history replay
- mode-specific ambiguity stops

## Risks

Showing target choice too often would add friction to simple one-variable workflows.

## Pattern

Stored variables are values, not unknowns.

## Why It Matters

Calculator-style variable memory can be useful, but hidden substitution can make an equation result wrong while appearing exact.

## Smallest Bounded Translation

Treat stored values as candidates only. Substitution must be explicit or visibly recorded in a later milestone.

## Required Prerequisites

- role model
- replayable value-source metadata
- result details for substitutions

## Risks

Variable memory can make history entries non-reproducible if values change.

## Pattern

Active and bound variable separation.

## Why It Matters

Calculus and Table need active variables, while integrals and derivatives also bind variables syntactically. These are not the same as Equation solve targets.

## Smallest Bounded Translation

Represent active variable and bound variable roles separately in the shared core.

## Required Prerequisites

- calculus parser evidence
- table policy evidence
- mode policy inputs

## Risks

Trying to support multivariable calculus too early would exceed the milestone.

## Pattern

Variable facts travel with assumption facts.

## Why It Matters

Domain exclusions, interval hazards, branch facts, and candidate rejections are more useful when scoped to the variable role that produced them.

## Smallest Bounded Translation

Let future variable-role metadata reference `AssumptionFact[]` without changing the fact vocabulary yet.

## Required Prerequisites

- `ASSUMPTIONS-CORE0`
- readback policy
- history metadata policy

## Risks

Overloading assumption facts with variable-role state would blur separate responsibilities.
