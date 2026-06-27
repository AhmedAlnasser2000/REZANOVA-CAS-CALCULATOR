# Manual App Checklist

## Attribution

primary_agent: codex
primary_agent_model: gpt-5-codex
contributors: []
recorded_by_agent: codex
recorded_by_agent_model: gpt-5-codex
verified_by_agent: codex
verified_by_agent_model: gpt-5-codex
attribution_basis: live

## What Is Achieved Now

`EQUATION-REAL-WRAPPER-COVERAGE-BUNDLE1` is implemented locally and covered by automated Real Exact regression tests. The checks below are optional app-level smoke checks before commit/release.

## Manual App Steps

Run the following in Equation, Real Exact, no numeric interval:

- `(z^3+z+1)/(z-m)=b`
- `(z^4+z+1)/(z-m)=b`
- `(a*(z^3+z+1)+c)/(d*(z^3+z+1)+h)=b`
- `1/(z^4+z+1)=b`
- `2*sqrt(z^3+z+1)+c=b`
- `sqrt[3](z^4+z+1)+c=b`
- `a*sqrt[5](z^3+z+1)+c=d`
- `sqrt[4]((z^4+z+1)/(z-m))+c=b`

Boundary checks:

- Complex Exact versions of the same shapes should remain unsupported.
- Mixed/two-radical forms should remain deferred.
- Nested wrapper forms should remain deferred.
- Existing abs, square-root, square-power, odd/even-power, nth-root, exp/log, trig, top-level Cardano, top-level Ferrari, and Formula Viewer behavior should remain stable.

## Expected Results

- Rational carrier wrappers solve through existing top-level rational Cardano/Ferrari normalization and do not show stale self-ratio fragments such as `(a-bd)/(a-bd)` in formula rows/details.
- Affine single-root wrappers solve by reducing the root output to a target-free expression, then delegating generated degree-3/4 equations to Real Cardano/Ferrari.
- Denominator exclusions, wrapper facts, generated-branch provenance, and case-local formula guards remain visible and structurally scoped.
- Heavy formula outputs stay compact in the source result and use Formula Viewer for full inspection.
