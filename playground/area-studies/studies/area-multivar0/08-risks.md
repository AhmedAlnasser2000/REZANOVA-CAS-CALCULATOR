# AREA-MULTIVAR0 Risks

## Correctness Risk

Silent target selection can produce mathematically valid answers to the wrong question.

Mitigation: multi-symbol solving must require an explicit solve target or return a controlled ambiguity stop.

## Honesty Risk

Stored variable values can make results appear symbolic while actually depending on hidden mutable state.

Mitigation: stored-value substitution must be visible, replayable, and blocked when the stored symbol is the solve target.

## Architecture Risk

Variable semantics could sprawl across modes if each mode invents local role metadata.

Mitigation: add `VARIABLE-CORE1` before `EQUATION-TARGET1`, `VARIABLE-MEMORY1`, or `POLY-ELIM2`.

## Licensing Risk

External mirrors contain useful evidence but cannot become copied implementation sources.

Mitigation: keep mirror use static, source-note-only, and translated into Calcwiz-native bounded policy.

## Mitigation

Proceed with `VARIABLE-CORE1` as an internal metadata substrate. Keep UI, solver behavior, variable memory, graphing, and bivariate elimination out of the first implementation slice.
