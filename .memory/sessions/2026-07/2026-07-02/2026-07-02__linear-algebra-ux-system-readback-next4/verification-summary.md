## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.4
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.4
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.4
- attribution_basis: live

## Gate Evidence

### 2026-07-02 - LINEAR-ALGEBRA-EDITOR-FOCUS-ESC1

- gate: ui
- status: complete
- summary: Esc now blurs the active editor and opens normal back/menu navigation from root Calculate/Matrix/Vector/Table; keypad insert/delete/navigation commands now ignore stale detached editor refs and focus the current visible editor before acting.
- tests:
  - `npm run test:ui -- --run src/app/workspaces/LinearAlgebraEditorSource.ui.test.tsx`
  - `npm test -- --run src/lib/navigation/menu.test.ts src/lib/linear-algebra/editor-dispatch.test.ts src/lib/linear-algebra/editor-parser.test.ts`
  - `npm run test:file-sizes`
  - `git diff --check`
- shared-memory-note: `.memory/current-state.md`, `.memory/decisions.md`, and `.memory/journal/2026-07/2026-07-02.md` already contained unrelated dirty work from other agents, so this gate records durable memory in this session dossier to avoid cross-agent staging.
