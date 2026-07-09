# EQUATION-TRIG-WRAPPER-FORMULA-POLICY0 Manual Checklist

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

- No new app behavior is expected from this policy gate.
- Trig wrapper Cardano/Ferrari formula handoff remains deferred.
- Existing low-degree/direct trig composition behavior should remain unchanged.

## Manual App Steps

- Try `sin(z^2+a)=b` in Real Exact.
- Try `sin(z^3+z+1)=b` in Real Exact.
- Try `tan(z^2+a)=b` in Real Exact.
- Try a current algebraic/exp-log formula-heavy result such as `ln((z^4+z+1)/(z-m))=b`.

## Expected Results

- `sin(z^2+a)=b` and `tan(z^2+a)=b` should continue through existing composition/low-degree paths with periodic integer facts.
- `sin(z^3+z+1)=b` should not yet route into Cardano/Ferrari formula output.
- Heavy already-live formula answers should use the compact-first presentation behavior from `FORMULA-PRESENTATION-PIPELINE2`.
