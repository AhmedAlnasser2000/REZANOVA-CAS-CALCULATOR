## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5-codex
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5-codex
- verified_by_agent: codex
- verified_by_agent_model: gpt-5-codex
- attribution_basis: live

## Summary

- Completed `CALCULUS-LIMITS-FAILURE-PROOF-CARD1`.
- Added `Why This Limit Fails` detail sections for two-sided finite-limit mismatch cases.
- The detail explains left-side behavior, right-side behavior, and why the two-sided limit does not exist.
- Added UI coverage that verifies the proof detail card appears on `lim x -> 0 1/x`.

## Scope Notes

- UI/backend explanation gate.
- Reuses existing Display `detailSections`.
- No new Display schema, History schema, OOE, worker, squeeze theorem, Gruntz, or broad limit algorithm changes.
