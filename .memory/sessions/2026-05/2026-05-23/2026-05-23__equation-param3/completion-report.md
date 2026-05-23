# EQUATION-PARAM3 Completion Report

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors:
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: direct

## Summary

`EQUATION-PARAM3` adds bounded rational selected-target parameterized solving.

Equation mode can now clear LCDs for supported rational equations in one selected target, preserve original denominator exclusions, and delegate the cleared degree-1 or degree-2 equation to the existing `EQUATION-PARAM1` or `EQUATION-PARAM2` solver.

## Implementation Notes

- Added `src/lib/equation/equation-parameterized-rational.ts`.
- Wired Equation mode to try parameterized families in order: linear, quadratic, rational.
- Added direct tests for LCD clearing, original and derived facts, case-sensitive targets, raw adjacent-letter rejection, degree-cap stops, target-inside-function stops, and nested-denominator stops.
- Added Equation mode and AppMain UI coverage for the selected-target rational flow.

## Boundaries

- No broad rational simplification.
- No cleared equations above degree 2.
- No nested target-denominator rational families.
- No variable memory, named string variables, `POLY-ELIM2`, graphing, Labs runner work, source-mirror execution, or copied source.
