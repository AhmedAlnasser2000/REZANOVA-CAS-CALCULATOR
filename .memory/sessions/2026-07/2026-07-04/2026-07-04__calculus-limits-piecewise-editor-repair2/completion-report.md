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

Completed `CALCULUS-LIMITS-PIECEWISE-EDITOR-REPAIR2`.

- Limit Piecewise row reorder now starts from the six-dot drag handle instead of making the entire input row draggable.
- The row editor and symbolic Piecewise parser recover MathLive/paste-glued friendly rows such as `-1ifx<0;1otherwise`.
- Condition fields strip an accidental leading `if`, keeping the visible row model as expression plus condition.
- Canonical serialized output remains LaTeX `cases` for readback, generated preview, copy, replay, and evaluation.

## Memory Notes

- Updated `.memory/journal/2026-07/2026-07-04.md`.
- Added this session dossier with completion, verification, and commit notes.
- `.memory/current-state.md` was not changed because this is a narrow bug repair inside the already-current Limits Piecewise posture, not a new operating-state change.
- `.memory/decisions.md` was not changed because the row-editor/canonical-cases direction was already locked; this milestone repairs the implementation.
