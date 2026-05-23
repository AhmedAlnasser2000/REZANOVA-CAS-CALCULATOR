# AREA-MULTIVAR0 Benchmark Families

## Family

Single-symbol current behavior.

## Source

Calcwiz Equation, Calculate, Calculus, and Table tests.

## Intended Use

Ensure future variable-role work preserves current one-variable flows.

## Boundary Notes

No target chooser should appear when the mode can infer the only valid variable.

## Adoption Status

Future regression family for `VARIABLE-CORE1`.

## Family

Two-symbol target ambiguity.

## Source

Calcwiz synthetic cases and calculator-style solve workflows from Giac/XCAS and GeoGebra evidence.

## Intended Use

Stress expressions such as `x+z=5`, `a*x+b=0`, and `x^2+y=0`.

## Boundary Notes

Do not solve until a target is chosen. Non-target symbols must be parameters or stored-value candidates by policy.

## Adoption Status

Future `EQUATION-TARGET1` regression family.

## Family

Stored value versus unknown conflict.

## Source

Calculator memory expectations from Casio/TI-style workflows and Maxima/Sage session-state cautionary evidence.

## Intended Use

Ensure a stored value for `x` never replaces `x` when `x` is the solve target.

## Boundary Notes

Variable memory does not exist yet; this is a future design benchmark.

## Adoption Status

Future `VARIABLE-MEMORY1` regression family.

## Family

Active and bound variable detection.

## Source

Calcwiz Calculus and Table workflows.

## Intended Use

Check `d/dt`, `\int ... dt`, `\lim_{t\to0}`, and Table independent-variable policy once implemented.

## Boundary Notes

No multivariable calculus expansion is implied.

## Adoption Status

Future `CALCULUS-VARIABLE1` and Table policy family.

## Family

Bivariate elimination blockers.

## Source

`AREA-POLY-ELIM0`, `POLY-ELIM1`, and source-mirror resultant evidence.

## Intended Use

Ensure `POLY-ELIM2` is not attempted until variable roles and target/projection variables are explicit.

## Boundary Notes

No bivariate resultants or polynomial systems are product tests yet.

## Adoption Status

Deferred behind `VARIABLE-CORE1` and `EQUATION-TARGET1`.
