## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors: user
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live

## What Is Achieved Now

- Finite symbolic cancellation limits can use a capped local-series route when simpler recursive leading terms cancel out.
- The user-facing Limit Method card explains that the first surviving local-series term was selected.

## Manual App Steps

- Open `Calculus > Limits > Limit`.
- Enter `lim x -> 0 (sin(a*x)-a*x)/x^3`.
- Press `Evaluate`.
- Open `Limit Method`.

## Expected Results

- The Answer card shows `-a^3/6`.
- Exactly one Answer card appears.
- `Limit Method` mentions a capped symbolic local series through order 10.

## Additional Cases To Try

- `lim x -> 0 (tan(a*x)-a*x)/x^3` should return `a^3/3`.
- `lim x -> 0 (e^(a*x)-1-a*x)/x^2` should return `a^2/2`.
