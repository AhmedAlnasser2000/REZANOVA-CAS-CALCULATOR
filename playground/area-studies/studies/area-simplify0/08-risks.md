# AREA-SIMPLIFY0 Risks

## Correctness Risk

Simplification can silently change domains, branches, or excluded points. The highest risk is treating equivalent-looking forms as globally interchangeable.

## Honesty Risk

Broad simplification can make Calcwiz look more powerful than it is. A pretty output that hides assumptions is worse than an honest stop.

## Architecture Risk

The dangerous path is centralizing all rewrites into one broad simplifier. `SIMPLIFY-CORE0` should be a policy layer, not a transform engine.

## Licensing Risk

The source mirrors have mixed licenses. This study records paths and ideas only. Direct code reuse remains disallowed unless a separate source/license review is opened.

## Mitigation

- Keep source mirrors static-only.
- Add policy metadata before rewrite behavior.
- Preserve existing transform owners.
- Require tests that prove shipped behavior does not change.
- Push broad assumptions/domain work to `AREA-ASSUMPTIONS0` if it becomes the real blocker.
