## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5-codex
- contributors: user
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5-codex
- verified_by_agent: codex
- verified_by_agent_model: gpt-5-codex
- attribution_basis: live

## Summary

- Implemented `CALCULUS-LIMITS-PIECEWISE-UX-HARDENING2` for the guided Calculus Limit row editor.
- Preserved authored condition spacing while typing or recovering pasted/friendly/cases piecewise input.
- Hardened row focus so active expression/condition fields do not jump back to row one during edits or soft focus.
- Kept drag/reorder cleanup inside the row editor so row swaps do not leave a stuck visual selection state.
- Preserved the clean Limit keypad contract: `Piecewise` only, no loose `+ Branch`, `if`, or `otherwise` keys.

## Boundaries

- No new limit algorithms.
- No Equation imports or inequality-solver dependency.
- No public Display schema changes.
- Unrelated integration and Equation dirty files were left unstaged and untouched.
