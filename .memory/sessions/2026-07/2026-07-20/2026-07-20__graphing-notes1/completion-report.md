# GRAPHING-NOTES1 completion report

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.6
- primary_agent_family: sol
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.6
- recorded_by_agent_family: sol
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.6
- verified_by_agent_family: sol
- attribution_basis: live

## Completed implementation gate

- gate: `GRAPHING-NOTES1`
- gate_type: backend and ui
- date: 2026-07-20

## Delivered

- Migrated Graph documents and workspace sessions to validated V2 contracts with V1 recovery.
- Split content and mathematics revisions so Notes and ordering cannot trigger sampling.
- Migrated sampling to V4 and runtime scenes to geometry-only V2 contracts; presentation now reaches renderers independently.
- Added plain multiline Notes with auto-growth, explicit 16,384-character feedback, undo/delete/reorder support, presentation read-only behavior, and no mathematical or viewport authority.
- Added pointer drag, keyboard grab/move/drop, and explicit Move Up/Down controls for every persisted row while keeping the blank expression row last and unpersisted.

## Durable memory updated

- `.memory/current-state.md`
- `.memory/decisions.md`
- `.memory/journal/2026-07/2026-07-20.md`
- this session dossier

## Commit posture

- The user authorized a separate Move 18 commit and continuation through Move 20. No push is authorized.
