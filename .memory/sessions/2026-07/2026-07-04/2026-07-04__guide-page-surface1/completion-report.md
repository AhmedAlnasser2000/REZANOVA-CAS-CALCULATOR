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

Completed `GUIDE-PAGE-SURFACE1`.

Guide now opens as the protected singleton `guide-page` app surface instead of replacing the active calculator workspace. The existing Guide content is rehosted through `ActiveSurfaceHost` as a page outside `.calculator-shell`, with app-page tab policy, null Order of Execution runtime context, no quick inspectors, and page-styled home/search/symbol/mode/article views.

The current calculator tab and current calculator mode stay intact when opening Guide. The tab plus-menu now offers `Open Guide Page`, and shell Guide openers route into the singleton Guide page while setting the requested Guide route.

## Git Maintenance

- Created `.git/recovery/gc-cleanup-20260704-223330/`.
- Saved status, object counts, gc log, unreachable-object scan, dangling commit ids, and `.git/objects` backup tarball before pruning.
- Ran `git prune --expire=now`, removed `.git/gc.log`, ran `git gc`, and verified connectivity.
- No tracked files changed as part of Git GC cleanup.

## Scope Boundary

- Notebook blocks, teacher/community packages, import/export, highlights, rich text editing, MathLive notebook blocks, Guide persistence, and external embedding remain deferred.
- Legacy `ModeId` value `guide` remains compatibility-only for older paths; new public page identity is `guide-page`.

## Memory Files Updated

- `.memory/current-state.md`
- `.memory/decisions.md`
- `.memory/journal/2026-07/2026-07-04.md`
- `.memory/sessions/2026-07/2026-07-04/2026-07-04__guide-page-surface1/`
