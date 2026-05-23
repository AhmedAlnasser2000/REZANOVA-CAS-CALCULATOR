# EQUATION-PARAM4 Completion Report

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

`EQUATION-PARAM4` adds bounded nonperiodic carrier selected-target parameterized solving.

Equation mode can now isolate one absolute-value, square-root, or square-power carrier in the selected target, generate branch equations, and delegate those branches to the existing selected-target linear, quadratic, or rational parameterized solvers where safe.

## Implementation Notes

- Added `src/lib/equation/equation-parameterized-carrier.ts`.
- Extended the rational parameterized helper with an internal generated-equation option so carrier branch handoff can avoid rejecting generated implicit products.
- Wired Equation mode to try parameterized families in order: linear, quadratic, rational, then nonperiodic carrier.
- Added direct tests for absolute-value carriers, square-root carriers, square-power carriers, rational carrier branches, nested/deep composition stops, raw adjacent-product rejection, and unsupported powers.
- Added Equation mode and AppMain UI coverage for the selected-target carrier flow.

## Boundaries

- No periodic trig composition.
- No broad or deep `COMP` composition reopening.
- No nested carrier towers.
- No variable memory, named string variables, `POLY-ELIM2`, graphing, Labs runner work, source-mirror execution, or copied source.
- Restriction-formatting polish such as inverse-power notation versus fraction notation remains deferred readback work.
