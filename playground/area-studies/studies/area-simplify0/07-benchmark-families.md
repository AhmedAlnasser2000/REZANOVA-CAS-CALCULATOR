# AREA-SIMPLIFY0 Benchmark Families

These are reference/challenge families, not product parity claims and not current CI expectations unless a later Calcwiz-native milestone promotes them.

## Family

Rational cancellation with preserved exclusions.

## Source

Calcwiz rational-function core, SymPy `ratsimp`, Maxima rational simplification, SymEngine numerator/denominator tests.

## Intended Use

`honesty`

## Boundary Notes

Examples like `(x^2-1)/(x-1) -> x+1` must preserve `x != 1` when the replacement matters.

## Adoption Status

candidate

## Family

Factored vs expanded vs canceled forms.

## Source

Calcwiz factor/expand, SymPy simplify/factor/expand, Maxima factor/rational forms, Giac/XCAS calculator commands.

## Intended Use

`correctness`

## Boundary Notes

Equivalent algebraic forms should not be swapped arbitrarily when the user requested a specific form.

## Adoption Status

candidate

## Family

Partial-fraction readback for rational integration.

## Source

Calcwiz `POLY-RAT-CORE1`, FriCAS partial fractions, SymPy apart/rational integration, Maxima/Giac rational integration context.

## Intended Use

`future-challenge`

## Boundary Notes

Readable log/arctan output needs equivalence, derivative verification, and domain notes before `INT-RAT2`.

## Adoption Status

candidate

## Family

Power-log and radical forms.

## Source

Calcwiz power-log/radical helpers, SymPy powsimp/radsimp, Maxima simplification packages.

## Intended Use

`edge-case`

## Boundary Notes

Power/root/log transformations are branch-sensitive and should not become broad automatic rewrites.

## Adoption Status

candidate

## Family

Trig identity simplification.

## Source

Calcwiz trigonometry identities, SymPy trigsimp, Maxima trigi, FriCAS trig category, Giac/XCAS calculator identity behavior.

## Intended Use

`honesty`

## Boundary Notes

Bounded identities should stay separate from broad equivalence proving.

## Adoption Status

deferred

## Family

Readable vs canonical calculus output.

## Source

Calcwiz integration/limit readback, Sage symbolic expression workflow, GeoGebra CAS workflow evidence.

## Intended Use

`future-challenge`

## Boundary Notes

This should guide `INT-RAT2` and later calculus readback, not change current results.

## Adoption Status

candidate
