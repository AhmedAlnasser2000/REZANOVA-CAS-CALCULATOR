# AREA-MULTIVAR0 Synthesis

## Findings

The study confirms that multivariable support is an app-wide semantic problem, not simply a polynomial-elimination problem.

Calcwiz currently has many honest one-variable assumptions: Equation symbolic mode solves in `x`, Table builds around `x`, guided Calculus emits `dx` and `d/dx`, and polynomial/rational cores are one-variable. That is acceptable today. The risk begins when Calcwiz starts consuming bivariate resultants or variable memory without a shared notion of variable roles.

The source mirrors agree on the important pattern: algorithms need explicit variable/generator/target context. They differ in scale and identity, but none suggest that Calcwiz should silently guess a target or conflate stored values with unknowns.

## What To Carry Forward

- symbol discovery before execution
- explicit solve targets for ambiguous equations
- stored values as visible substitutions, not hidden unknown replacements
- separate roles for active variables and bound variables
- symbolic parameters as a deliberate role, not an accident
- mode-specific policies over a shared vocabulary
- replayable metadata for variable choices
- strict blocker for `POLY-ELIM2` until variable roles exist

## What Not To Inherit

- FriCAS's full typed-domain runtime
- SymPy's broad symbolic assumptions surface
- Maxima's hidden global session assumptions
- SageMath's backend/parent platform identity
- Giac/XCAS full command-style CAS breadth
- SymEngine-only representation without product readback
- GeoGebra's graph-first workflow sequencing

## Capability Boundary

`AREA-MULTIVAR0` remains study-only.

Future implementation should start with a small internal role core, not product UI:

- one shared vocabulary
- mode policy inputs
- explicit controlled stops
- metadata for future history replay

Visible target selection, variable memory, multivariable calculus, and polynomial-system solving must be separate later milestones.

## Decision

Recommended next move: `VARIABLE-CORE1`.

Reason: `EQUATION-TARGET1` would add UI before the shared role vocabulary exists. `VARIABLE-MEMORY1` would introduce dangerous state before the app can protect solve targets. `CALCULUS-VARIABLE1` is important, but too narrow for the app-wide problem. `defer` is too passive because `POLY-ELIM2` and future variable memory are now clearly blocked on the same missing foundation.
