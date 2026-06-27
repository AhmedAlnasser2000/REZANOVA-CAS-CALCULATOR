# Manual App Checklist

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5-codex
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5-codex
- verified_by_agent: codex
- verified_by_agent_model: gpt-5-codex
- attribution_basis: live

## What Is Achieved Now

`EQUATION-REAL-MIXED-RADICAL-WRAPPER-BUNDLE1` enables Real Exact formula handoff for one selected-target square-root carrier mixed additively with target-free or non-carrier terms.

## Manual App Steps

Run in Equation, Real Exact, target `z`, numeric interval off:

- `sqrt(z^3+z+1)+z=b`
- `sqrt(z^4+z+1)+z=b`
- `sqrt(z^3+z+1)+sqrt(a)=b`
- `sqrt(z+a)+z=b`

Boundary checks:

- Complex Exact `sqrt(z^3+z+1)+z=b` should remain unsupported for this formula route.
- `sqrt(z^3+z+1)+sqrt(z+1)=b` should remain deferred.
- `sqrt(sqrt(z^3+z+1))+z=b` should remain deferred.

## Expected Results

- Cubic/quartic mixed square-root cases show Real Cardano/Ferrari formula cases and a mixed algebraic branch detail.
- Branch conditions such as `b-z>=0` or `b-sqrt(a)>=0` remain visible.
- Existing low-degree mixed algebraic cases still solve without Real formula case sections.
- No Display, OOE, History, Tauri, app-state, persisted schema, or copy contract changes are involved.
