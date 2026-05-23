# AREA-MULTIVAR0 Scope

## Capability Area

Variable semantics and multivariable readiness.

This area covers the app-wide meaning of symbols before Calcwiz adds bivariate elimination, polynomial systems, stored variable values, or broad multi-symbol solving.

## Goal

Decide the first safe Calcwiz-native implementation milestone for variable roles.

The study must answer whether the next implementation should be:

- `VARIABLE-CORE1`
- `EQUATION-TARGET1`
- `VARIABLE-MEMORY1`
- `CALCULUS-VARIABLE1`
- `defer`

## In Scope

- symbol discovery
- reserved constants and function-name filtering
- solve target selection
- stored numeric variable values versus unknowns
- symbolic parameters
- active variables in Table and Calculus
- bound variables in derivatives, integrals, and limits
- unsupported symbols and controlled stops
- history replay and typed variable-role context
- assumption facts per variable
- future relationship to `POLY-ELIM2` and polynomial systems

## Out Of Scope

- variable memory implementation
- Equation solve-target UI
- multivariable solving
- bivariate resultants
- Grobner bases
- polynomial-system solving
- graphing
- source-mirror execution
- copied external source code

## Prerequisite Check

Available:

- Equation owns explicit solving rather than Calculate solving implicitly.
- Calculus and Table already expose one-active-variable workflows.
- `ASSUMPTIONS-CORE0` and follow-up readback/polish give a fact spine for future variable facts.
- `POLY-ELIM1` gives scalar univariate resultants without requiring bivariate policy yet.

Missing:

- shared symbol-discovery core
- variable-role vocabulary in stable runtime types
- target selection policy
- stored-variable substitution policy
- typed history/replay context for variable roles
- product-safe polynomial-system boundary
