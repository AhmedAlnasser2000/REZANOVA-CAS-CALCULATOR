# FORMULA-PRESENTATION-RENDER-SCHEDULER-ROADMAP0 Manual App Checklist

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live

## What Is Achieved Now

- A dedicated roadmap exists for stabilizing heavy formula rendering before new wrapper widening.
- Existing wrappers remain live; future wrapper expansion is paused behind Display scheduler work.

## Manual App Steps For The Future Display Gate

- Run `sin((z^3+z+1)/(z-m))=b` in Real Exact.
- Run `ln((z^4+z+1)/(z-m))=b` in Real Exact.
- Run `sqrt[4](z^4+z+1)=b` in Real Exact.
- Run `(z^4+z+1)^6=b` in Real Exact.
- Run `x^3+p*x^2*q+x=1` in Real Exact.
- Run `sqrt(x+1)=x-1` in Real Exact.

## Expected Results After The Future Gate

- Heavy formula answers show a cheap summary first.
- Full formula expansion renders progressively instead of all at once.
- New input, collapse, restart, or tab retarget cancels pending formula row rendering.
- Copy Result remains stable.
- Extraneous Solutions remains visible when validation rejects candidates.

