# COMPLEX-PREIMAGE-EQUATION1 Completion Report

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

Implemented `COMPLEX-PREIMAGE-EQUATION1` as the next guarded Equation-only complex route after `COMPLEX-DISPLAY-SETTINGS1`.

The milestone adds guarded complex preimage solving for selected logarithmic, exponential, trigonometric, rational, affine, and bounded-power shapes in `Exact + Complex On`, while preserving real-first behavior outside that route.

## Completed

- Added a complex preimage route that reduces supported outer functions into exact inner equations and delegates the inner equations back into bounded complex algebraic solving.
- Supported principal `ln` / supported `log` finite preimages for affine and rational-linear inners.
- Supported `exp(g(x)) = c` families with integer branch parameter `k in Z` for finite/affine/rational-linear/power inners where readback remains controlled.
- Supported complex trig preimage branch families for `sin`, `cos`, and `tan` over direct affine inners.
- Added exact rational preimage handling for supported quadratic-over-linear equations such as `(x^2+1)/(x-2)=i`.
- Added root-family readback for parameterized periodic-power routes such as `exp(x^2)=1` and `exp(x^4)=1`.
- Added collapsed expanded-branches detail sections for periodic-power root-family answers.
- Honored active angle unit in complex trig branch-family readback.
- Kept denominator exclusions and complex logarithm preconditions in `Valid when`.

## Boundaries Preserved

- No complex `Approximate` search.
- No complex `Isolate` solving.
- No stored complex values.
- No non-Equation complex adoption.
- No absolute-value complex locus solving.
- No broad unfactorable cubic/quartic formulas.
- No OOE runtime behavior change.
- No Rust solver execution.

## Notes

Complex logarithm routes use the principal branch plus explicit integer-periodic families where appropriate. Parameterized periodic-power answers intentionally use concise root-family notation in the main answer and put expanded branches in a detail section.
