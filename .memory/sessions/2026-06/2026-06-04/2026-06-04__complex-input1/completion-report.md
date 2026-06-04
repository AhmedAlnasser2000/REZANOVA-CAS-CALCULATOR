# COMPLEX-INPUT1 Completion Report

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors:
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live

## Summary

Implemented the Equation-first imaginary input contract before the broader algebraic complex engine.

## Completed

- Standalone `i` is normalized to `\imaginaryI` in Equation input.
- Existing `\imaginaryI` is preserved.
- `j` remains a normal symbol and is not treated as an imaginary unit.
- Glued identifiers such as `xi` remain untouched.
- Compute Engine `ImaginaryUnit` is now reserved in variable discovery, so it is not exposed as a solve target or symbolic parameter.
- Complex Off now returns controlled guidance for explicit imaginary input instead of falling into target-discovery ambiguity.
- Equation OOE provenance records whether the input contained an explicit imaginary unit.

## Boundaries Preserved

- No stored complex values.
- No non-Equation adoption.
- No Approximate complex search.
- No Isolate complex solving.
- No broad complex parser beyond `i` / `\imaginaryI`.

## Next

- `COMPLEX-EQUATION3` should consume this contract and solve bounded algebraic exact complex routes when `Complex On`.
