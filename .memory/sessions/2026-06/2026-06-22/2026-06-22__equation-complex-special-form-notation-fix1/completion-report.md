## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live

## Summary

Fixed the Complex high-degree special-form readback regression where branches were forced to `cis` notation regardless of the selected `complexExactForm`.

## Completed Work

- Threaded `complexExactForm` into high-degree special-form branch rendering.
- Kept `cis` notation only when `complexExactForm === 'cis'`.
- Used exact trigonometric branch notation for `rectangular` and `polar` until rectangular radical coordinate expansion is implemented.
- Updated focused Complex tests so the selected exact form is enforced.

## Non-Goals

- No new Complex families.
- No symbolic-coefficient Complex carrier roots.
- No rectangular radical expansion for high-degree roots.
- No schema, OOE, app-state, Tauri, Display layout, graphing, step-by-step, or numeric fallback changes.
