# COMPLEX-EQUATION3 Completion Report

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

Implemented `COMPLEX-EQUATION3` as the major algebraic complex Equation milestone after `COMPLEX-INPUT1`.

When `Complex On` and Equation answer mode is `Exact`, bounded algebraic routes can now return marked complex-domain answers for explicit imaginary linear equations, supported factorable polynomial equations, selected-target power carriers already covered by the bounded complex route, and supported rational equations by numerator roots.

## Completed

- Added typed exact complex branch/readback helpers with stable ordering, dedupe, and clean `i`, `-i`, and `a+bi` / `a-bi` formatting.
- Added direct explicit complex linear support for examples such as `x+\imaginaryI=0` and `x-(2+3\imaginaryI)=0`.
- Expanded factorable real-coefficient polynomial handling through degree 4 where factors reduce to supported linear/quadratic branches and at least one branch is non-real.
- Added rational complex equation support by solving supported numerator roots while preserving denominator exclusions in `Valid when`.
- Threaded `approxText` through bounded complex isolation success so `BOTH` can show exact main branches plus approximate complex readback.
- Passed the active `EXACT`, `DECIMAL`, and `BOTH` output-style setting into bounded complex routes.
- Moved the complex route ahead of real parameterized linear/polynomial helpers in the unsupported-parameter branch so explicit imaginary equations are not hijacked as real symbolic-parameter equations.

## User-Facing Behavior

- `Complex Off` keeps real-first behavior and controlled guidance for explicit imaginary input.
- `Complex On + Exact` can solve:
  - `x+\imaginaryI=0`;
  - `x-(2+3\imaginaryI)=0`;
  - `x^2+1=0`;
  - `(x-1)(x^2+1)=0`;
  - `(x^2+1)/(x-2)=0`;
  - selected-target power/polynomial cases already supported by the bounded complex algebraic route.
- Rational complex results show denominator exclusions through `Valid when`.
- Actual complex results show `Domain: Complex` through existing result-domain readback without duplicate intent noise.

## Boundaries Preserved

- No stored complex values.
- No non-Equation adoption.
- No Approximate complex search.
- No Isolate complex solving.
- No complex trig/log/exp solving.
- No Cardano/Ferrari formulas for unfactorable cubic/quartic equations.
- No numeric-only roots masquerading as Exact.
- No OOE runtime behavior change.
- No Rust solver execution.

## Next

Future complex work should move into separate complex readback/composition/preimage milestones for trig/log/exp behavior, mirroring the inequality route sequencing. Do not silently widen `COMPLEX-EQUATION3` into transcendental complex solving.
