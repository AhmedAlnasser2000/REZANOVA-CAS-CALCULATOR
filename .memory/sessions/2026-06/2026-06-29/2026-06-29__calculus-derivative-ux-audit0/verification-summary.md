# CALCULUS-DERIVATIVE-UX-AUDIT0 Verification Summary

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live

## Status

Verified as a docs/memory-only audit.

- commit_hash: final hash reported in git/final handoff after commit

## Evidence

- Read derivative UI ownership in `src/app/workspaces/CalculusWorkspace.tsx`.
- Read Calculus main-editor source ownership in `src/app/runtime/useCalculusRuntime.ts` and `src/app/shell/display-panel/DisplayEditorSurface.tsx`.
- Read generated-request and active-expression routing in `src/app/runtime/calculus-origin-request.ts` and `src/AppMain.tsx`.
- Read focus routing in `src/app/logic/focusRouting.ts` and `src/app/runtime/useShellFocusRuntime.ts`.
- Read derivative runtime delegation in `src/lib/calculus/workspace/engine.ts` and `src/lib/modes/calculus.ts`.
- Read Display preview/result ownership in `src/app/shell/DisplayPanel.tsx`, `src/app/shell/display-panel/DisplayPreviewSurface.tsx`, and `src/app/shell/display-panel/DisplayResultBlocks.tsx`.
- `npm run test:memory-protocol`
  - Passed.
- `git diff --cached --check`
  - Passed.
- No runtime tests required because this milestone changes only docs and durable memory.
