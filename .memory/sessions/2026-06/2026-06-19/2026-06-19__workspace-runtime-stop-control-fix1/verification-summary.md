# WORKSPACE-RUNTIME-STOP-CONTROL-FIX1 Verification Summary

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors:
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live

## Passing

- `npx tsc -b --pretty false`
- `npx vitest run src/app/runtime/runtimeElapsedTime.test.ts src/lib/ooe/job-launch/launch-tickets.test.ts src/lib/app-state/history-schema.test.ts src/app/logic/editorRuntimeControl.test.ts`
- `npm run test:ui -- src/app/runtime/useHistoryDisplayRuntime.ui.test.tsx src/app/shell/DisplayPanel.ui.test.tsx`
- `npm run test:ui -- src/app/runtime/useHistoryDisplayRuntime.ui.test.tsx src/app/runtime/useHistoryDisplayRuntime.stop.ui.test.tsx src/components/HistoryPanel.ui.test.tsx src/app/runtime/useWorkspaceRuntimeStateHostRuntime.ui.test.tsx src/AppMain.status.ui.test.tsx src/app/shell/DisplayPanel.ui.test.tsx src/app/runtime/useWorkspaceTabsShellRuntime.ui.test.tsx`
- `npm run test:memory-protocol`
- `npm run test:file-sizes`
- `npm run lint`
- `npm run build`
- `git diff --check`
- Live app Playwright smoke against `npm run dev` on `http://127.0.0.1:1420/`: opened Calculus > Derivatives > Derivative, entered the hard derivative expression `\tan(\cot^{-x}(mx+\sqrt{\cos(sx+\sin x)}))`, opened History, ran it, then pressed the Display header Stop. Observed `Computing · 0s` with a pending Calculus row before Stop, then `Calculus evaluation stopped` and no pending rows after Stop.
- Live app Playwright smoke against the same route/expression: pressed Restart Editor while the hard Calculus runtime was running. Observed the pending row removed and no continuing `Computing` state.

## Notes

- The live Restart smoke confirmed cancellation but also showed the Calculus derivative field retaining the expression after restart; recorded separately in `.memory/open-questions.md`.
- `npm run build` completed successfully with the known Vite dynamic/static import chunking warnings.
- The recurring Node `NO_COLOR` / `FORCE_COLOR` warning appeared during commands and did not fail any passing gate.
