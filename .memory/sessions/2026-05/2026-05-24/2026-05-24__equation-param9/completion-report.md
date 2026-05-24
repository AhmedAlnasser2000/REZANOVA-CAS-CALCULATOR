# EQUATION-PARAM9 Completion Report

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

Implemented `EQUATION-PARAM9` as factorable polynomial selected-target solving.

## Changes

- Added a selected-target factorable polynomial helper.
- Supports explicit zero-products up to degree 4 by delegating factor branches to PARAM1/PARAM2.
- Dedupes repeated roots while preserving multiplicity readback.
- Reuses the existing exact-rational bounded polynomial factor core for expanded cubic/quartic helper cases.
- Wires the family after PARAM8 and before carrier/exp/log/trig families.

## Boundaries

- No general symbolic cubic/quartic formulas.
- No degree greater than 4.
- No partial solution sets when any target-containing factor is unsupported.
- No Guide update, rational widening, composition, symbolic-base exp/log, variable memory, named string variables, `POLY-ELIM2`, graphing, source execution, or Labs runner work.

## Next Recommendation

`EQUATION-PARAM10` should be the next Equation capability/policy slice when desired, focused on symbolic-base exp/log policy.
