# COMPLEX-READBACK-STABILITY1 Completion Report

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

Implemented `COMPLEX-READBACK-STABILITY1` as a stabilization/readback milestone after `COMPLEX-INPUT1` and `COMPLEX-EQUATION3`.

The main effect is that Equation analysis now treats `i` / `\imaginaryI` as a visible reserved imaginary unit rather than a variable candidate, while bounded complex branch readback avoids construction artifacts for awkward exact roots.

## Completed

- Added a `reserved-unit` identifier/hint kind for the imaginary unit.
- Kept `i` / `\imaginaryI` out of Equation solve-target, parameter, stored ignored, and ambiguous hint lanes.
- Added visible hint-strip readback as `i reserved unit`.
- Preserved Complex Off guidance for explicit imaginary input while still recognizing `i` as reserved.
- Added bounded complex power branch readback that can use exact `\operatorname{cis}` notation for awkward roots such as `x^4+i=0`.
- Preserved clean rectangular readback for simple complex values such as `-i`, `i`, and `2+3i`.
- Honored `EXACT`, `DECIMAL`, and `BOTH` output style for bounded complex power branch readback.
- Kept `j` and `k` as ordinary symbols; no reserved-symbol override syntax was added.

## User-Facing Behavior

- Equation variable hints show `i reserved unit` for standalone `i` / `\imaginaryI`.
- `i` no longer appears as a solve target or parameter in Equation complex input.
- `Complex Off` still stops explicit imaginary-unit input with guidance to enable Complex.
- `Complex On + Exact` keeps existing algebraic complex capability but renders awkward exact branch construction more cleanly.

## Boundaries Preserved

- No new complex solver family.
- No complex trig/log/exp solving.
- No stored complex values.
- No Approximate complex search.
- No Isolate complex solving.
- No reserved constant/function override system.
- No non-Equation adoption.
- No OOE runtime behavior change.
- No Rust solver execution.

## Next

Future complex work may add composition/preimage milestones for complex trig/log/exp, but this stabilization pass should remain a readback and reserved-unit boundary only.
