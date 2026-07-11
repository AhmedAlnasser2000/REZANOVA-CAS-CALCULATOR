# NOTEBOOK-RICH-DOCUMENT-MODEL1 Gate

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.6
- primary_agent_family: terra
- contributors:
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.6
- recorded_by_agent_family: terra
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.6
- verified_by_agent_family: terra
- attribution_basis: live

## Gate

- type: backend
- result: pass

## Evidence

- Six official Tiptap packages are pinned together at `3.27.3`; all direct and traversed runtime dependencies passed the permissive-license allowlist.
- The version-2 app-owned document model, nested block counting, summaries, four starter templates, version-1 migration, and persistence-port adapter passed 17 focused tests.
- Stale accepted math spans preserve their original prose during migration.
- `npx tsc -b --pretty false`: pass.
- `npm run test:file-sizes`: pass, 1,671 files checked.
- `npm run test:memory-protocol`: pass before the milestone memory update.
- `git diff --check`: pass.

## Exclusions Confirmed

- No History, app-state, Tauri, MathEditor, Clipboard, expression-routing, AppMain, ActiveSurfaceHost, or display-contract source was changed.
- No production persistence adapter was wired.
