## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors: user
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live

## Summary

- Implemented `CALCULUS-LIMITS-PARAMETER-ASSUMPTIONS1`.
- Extended symbolic infinity guarded cases so polynomial-scale limits can continue past vanished symbolic coefficients.
- Added fallthrough rows for lower-degree numeric growth and target-free constants.
- Preserved the current answer-card case compaction behavior; larger guarded formulas remain available through Formula Viewer while proof cards carry compact evidence.

## Boundaries

- No assumptions UI was added.
- No Equation solver or inequality solver import.
- No public Display schema changes.
- No Gruntz, symbolic targets, or broader limit algorithms in this gate.
- Unrelated active integration, Display, Linear Algebra, Equation, and Guide dirty files were left unstaged and untouched.
