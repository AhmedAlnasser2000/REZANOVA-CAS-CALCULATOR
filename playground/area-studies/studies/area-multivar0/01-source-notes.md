# AREA-MULTIVAR0 Source Notes

## Source

Calcwiz current codebase.

## Relevant Capability

Calcwiz has several one-variable assumptions in stable product paths. Equation symbolic mode currently solves in `x`, Table builds with `variable: 'x'`, guided Calculus builders generate `dx` / `d/dx`, and partial derivative types are limited to `x | y | z`.

## Enabling Pattern

Calcwiz already separates modes, so variable policy can be mode-specific while sharing one internal role vocabulary.

## Cost

Variable semantics touch many surfaces: Calculate, Equation, Calculus, Table, history replay, result details, and future variable memory. A broad UI change now would be risky.

## Calcwiz Translation Hint

Start with internal discovery/classification only. Do not add visible target-selection or stored-variable behavior until the role model is stable.

## Source

FriCAS static context mirror.

## Relevant Capability

FriCAS treats algebraic objects through typed domains and variable-aware polynomial/ring contexts.

## Enabling Pattern

Variable meaning is carried by the mathematical domain or ring, not guessed from display text.

## Cost

The full domain/category model is too large for Calcwiz and would violate the bounded app-owned architecture.

## Calcwiz Translation Hint

Use explicit owner descriptors such as active variable, solve target, and parameter; do not inherit a full domain runtime.

## Source

SymPy static context mirror.

## Relevant Capability

SymPy expressions expose free-symbol style discovery, assumptions, symbolic solving targets, and polynomial generators.

## Enabling Pattern

Symbols are first-class objects and solve/generator choices are algorithm inputs.

## Cost

SymPy's public symbolic breadth and assumptions API are far wider than Calcwiz should expose.

## Calcwiz Translation Hint

Borrow the idea that symbols must be collected and classified before solving; keep Calcwiz role types smaller and product-directed.

## Source

Maxima static context mirror.

## Relevant Capability

Maxima has a traditional CAS model with named variables, global assumptions, solve targets, and polynomial/resultant commands.

## Enabling Pattern

Users expect commands to distinguish solve variables from parameters.

## Cost

Global assumptions and session-variable behavior can make product results harder to replay and explain.

## Calcwiz Translation Hint

Avoid hidden global state. If variable memory exists later, make substitution visible and replayable.

## Source

SageMath static context mirror.

## Relevant Capability

SageMath uses explicit parent structures, polynomial rings, generator choices, and backend orchestration for multivariable algebra.

## Enabling Pattern

Variable names, rings, and coefficient domains are chosen before algorithms run.

## Cost

SageMath's parent/backend system is a platform identity, not a small calculator policy.

## Calcwiz Translation Hint

Use tiny descriptors for variable roles and future polynomial-ring ownership instead of backend-style parents.

## Source

Giac/XCAS static context mirror.

## Relevant Capability

Giac/XCAS is calculator-adjacent and supports solve/resultant workflows where the variable or variables matter to the command.

## Enabling Pattern

Calculator-style CAS can still require explicit variable arguments for ambiguous expressions.

## Cost

Full command-surface parity would make Calcwiz too broad and too opaque.

## Calcwiz Translation Hint

Use explicit target choice in guided UI rather than broad command syntax.

## Source

SymEngine static context mirror.

## Relevant Capability

SymEngine keeps symbolic representation and polynomial facilities comparatively lean.

## Enabling Pattern

Small symbolic primitives can remain useful when roles are explicit and algorithms are narrow.

## Cost

Representation alone is not enough for product readback, stored variables, or solve-target UX.

## Calcwiz Translation Hint

Keep the core minimal, but pair it with result/detail metadata.

## Source

GeoGebra static context mirror.

## Relevant Capability

GeoGebra highlights workflow-level differences among CAS input, geometry objects, functions, and spreadsheet/statistics variables.

## Enabling Pattern

Product contexts decide whether a name is an object, variable, function, or data label.

## Cost

GeoGebra's graph/workflow identity is not Calcwiz's near-term target.

## Calcwiz Translation Hint

Treat mode context as part of symbol interpretation, while keeping graphing deferred.
