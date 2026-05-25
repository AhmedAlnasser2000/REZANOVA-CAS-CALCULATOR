# Tauri Watch-Limit Preflight Verification Summary

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors:
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: direct

## Verification

- `npm run test:launch-preflight` passed.
- `npm run tauri:dev` now exits during preflight with a clear low-inotify-limit repair message on the current host.
- `npm run pretauri:build` passed, confirming the file-watch check is limited to dev launches.
- `npm run lint` passed.

## Host Limits Observed

- `fs.inotify.max_user_watches = 65536`
- `fs.inotify.max_user_instances = 128`
- `fs.inotify.max_queued_events = 16384`

These are below the repo preflight recommendations for this watcher-heavy workspace.
