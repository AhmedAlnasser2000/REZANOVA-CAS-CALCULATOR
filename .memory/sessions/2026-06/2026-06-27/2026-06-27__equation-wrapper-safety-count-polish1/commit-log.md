# Commit Log

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- committed_by_agent: codex
- committed_by_agent_model: gpt-5.5
- attribution_basis: live

Status: commit approved by user, paused for the user-found unsafe fallback, then resumed after the follow-up fix and refreshed gates passed.

Commit message:
- `EQUATION-WRAPPER-SAFETY-COUNT-POLISH1`

Planned commit scope:
- Equation mixed-trig safety regression tests.
- Producer-side mixed-trig `atan2` handoff/readback safety fix.
- Display block count metadata and tests.
- DisplayPanel / FormulaViewer visible count cue UI and tests.
- Formula Viewer/display lint refactors.
- Required durable memory for `EQUATION-WRAPPER-SAFETY-COUNT-POLISH1`.

Excluded scope:
- Existing unrelated Calculus/Symbolic Engine dirty files.
- No unrelated Calculus/Symbolic Engine implementation files are included in the final staged scope.
