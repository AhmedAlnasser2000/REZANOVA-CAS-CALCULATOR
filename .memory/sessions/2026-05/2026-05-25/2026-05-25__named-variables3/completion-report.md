# NAMED-VARIABLES3 Completion Report

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: direct

## Status

- status: completed
- date: 2026-05-25

## Summary

`NAMED-VARIABLES3` enables explicit named variables as Equation solve targets and corrects raw adjacent-letter Equation behavior so raw words remain multiplication while exposing their parsed single-letter targets.

## Implemented

- Equation target resolution now accepts explicit named variables from `@name`, `var(name)`, and normalized upright named tokens.
- Raw adjacent-letter input such as `mass` no longer blocks target selection when ComputeEngine parses it as a product of single-letter symbols.
- Equation mode can pass an explicit implicit-product allowance to the existing selected-target helper files after target resolution confirms the raw adjacent product policy.
- Named solve-target output is formatted as upright math text in primary LaTeX readback.
- Parameter detail extraction now includes explicit named variables as symbolic parameters where relevant.

## Boundaries

- Raw multi-letter input is still multiplication, not one variable.
- Direct helper calls still reject raw adjacent-letter products unless the Equation target resolver explicitly allows them.
- Equation symbolic stored values remain ignored/protected.
- No new solving family, graphing, `POLY-ELIM2`, source-mirror work, or Labs runner work.
