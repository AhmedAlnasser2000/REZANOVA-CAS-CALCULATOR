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

Completed `CALCULUS-LIMITS-PIECEWISE-ROW-EDITOR-REPAIR1`.

- The `Piecewise` keypad key now routes through the structured row-editor action instead of raw MathLive LaTeX insertion.
- Starter Piecewise rows now open as blank expression cells with `x<0` and `Otherwise` conditions; raw `\placeholder` tokens do not appear.
- Dropping a regular Piecewise branch onto the `Otherwise` row now swaps the branch expressions, matching the user's expected visual branch-position swap.
- The `Otherwise` row remains the final fallback row after the swap, preserving the locked row-editor rule that the fallback stays last.
- Active row focus stays in the edited field, the limit variable/approach controls remain editable while Piecewise is open, and the whole Piecewise block can be removed.
- Added UI and unit regression coverage for the structured keypad route, placeholder-free starter rows, focus, limit controls, remove behavior, and the exact two-row regular/fallback swap case.

## Memory Notes

- Added this session dossier with completion, verification, and commit notes.
- `.memory/journal/2026-07/2026-07-04.md` has the relevant Piecewise row-editor notes in the working tree but also contains unrelated active-agent entries in the same unstaged hunk, so it is not staged by this scoped commit.
- `.memory/current-state.md` was not changed because this is a narrow implementation repair inside the already-current Limits Piecewise posture.
- `.memory/decisions.md` was not changed because the `Otherwise`-last and structured row-editor decisions were already locked; this milestone only fixes the swap behavior.
