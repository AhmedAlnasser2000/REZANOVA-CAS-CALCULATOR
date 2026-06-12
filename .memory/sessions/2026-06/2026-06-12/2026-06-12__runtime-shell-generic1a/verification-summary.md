# RUNTIME-SHELL-GENERIC1a Verification Summary

Date: 2026-06-12
Agent: claude-code
Model: claude-fable-5

## Result

`RUNTIME-SHELL-GENERIC1a` extracted the shared AppMain-side OOE launch ritual into `src/app/runtime/launchWorkspaceRuntimeJob.ts` and migrated Trigonometry onto it.

## What Changed

- New `launchWorkspaceRuntimeJob<TRequest, TPayload>` helper (132 lines): reserve launch ticket -> run pilot with `activeInputRevisionId` staleness resolver and `launchTicket` -> cancelled check with discard + stop status -> `isOoeCommitAllowed` gate with discard -> visible-mode revision check -> `commit` callback with ticket info -> catch with ticket discard, mode-titled load error, and failed status.
- `runTrigAction` in `src/AppMain.tsx` now passes a config (mode/capability IDs, revision builder, live-request reader, dynamic-import runner, trig commit context) instead of inline wiring (~60 lines replaced by ~25).

## Boundaries

- Each mode keeps its own worker host, capability ID, and pilot; `src/lib/ooe/*` and `src/lib/modes/*-worker-client.ts` are untouched.
- The dynamic `import('./lib/modes/trigonometry')` stays in AppMain, preserving bundle-split chunking.
- No solver, history-schema, status-text, or display behavior changed.

## Verification

- `tsc -b` passed.
- `npm run test:unit` passed (185 files, 1,557 tests) with no test modifications.
- `npm run test:ui` passed (12 files, 162 tests) with no test modifications, including `AppMain.ui.test.tsx` and `AppMain.status.ui.test.tsx`.
- `npm run lint` and `npm run test:file-sizes` passed.
- `src/AppMain.tsx`: 7,871 -> 7,838 lines.
