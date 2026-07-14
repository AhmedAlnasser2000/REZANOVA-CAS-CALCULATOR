# Linear Algebra Exact/Decimal Completion Report

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.6
- primary_agent_family: sol
- contributors:
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.6
- recorded_by_agent_family: sol
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.6
- verified_by_agent_family: sol
- attribution_basis: live

## Completion

- `LINEAR-ALGEBRA-EXACT-DECIMAL-CONTROLS1` is implemented and verified.
- Projection `[2/3,2/3,2/3]` remains exact canonical/copy truth while Both and Decimal show `[0.6667,0.6667,0.6667]` at four digits.
- Precision survives worker execution, OOE snapshots, History persistence, and replay without changing hosts, capability IDs, cancellation/stale rules, or History ownership.
- Nonnumeric summaries, counts, dimensions, and verdicts are not mislabeled as approximations.

## Next Checkpoint

- Continue the approved program with `VECTOR-GRAM-SCHMIDT-N1`.
- Standing user approval covers the remaining approved Linear Algebra commits.
- Do not push.
