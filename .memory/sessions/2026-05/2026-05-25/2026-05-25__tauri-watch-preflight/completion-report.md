# Tauri Watch-Limit Preflight Completion Report

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors:
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: direct

## Summary

Improved the desktop dev preflight so low Linux inotify limits are detected before Tauri crashes with an opaque watcher error.

## Shipped

- Added inotify limit detection to `tools/check-tauri-linux-deps.mjs`.
- Added actionable repair output that points to `npm run fix:linux-watch-limits`.
- Added `tools/fix-linux-watch-limits.mjs` for the persistent host `sysctl` repair.
- Added tests for low file-watch limits.
- Updated README and symbolic runtime validation docs.
- Added local VS Code watcher/search excludes for watcher-heavy ignored paths.

## Boundaries

- Did not change app runtime behavior.
- Did not change Tauri build behavior.
- Did not raise system limits automatically because that requires host `sudo`.
- Did not touch OOE implementation.
