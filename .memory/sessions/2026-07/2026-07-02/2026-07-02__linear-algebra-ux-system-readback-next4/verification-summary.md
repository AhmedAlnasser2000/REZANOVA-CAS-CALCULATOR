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

### 2026-07-02 - MATRIX-SYSTEM-EXPLAINED-READBACK1

- gate: backend
- status: complete
- summary: Structured Matrix systems now say "Exactly one solution. Only this vector x satisfies the system." for one-solution cases and emit a visible-by-default collapsible `System Proof` detail card explaining the rank/RREF reason for exactly one, no-solution, and infinitely-many classifications.
- tests:
  - `npm test -- --run src/lib/linear-algebra/matrix-system.test.ts src/lib/display/result/display-blocks.test.ts src/lib/linear-algebra/editor-dispatch.test.ts src/lib/linear-algebra/editor-parser.test.ts`
  - `npm run test:ui -- --run src/app/runtime/useLinearAlgebraTableShellRuntime.ui.test.tsx src/app/workspaces/LinearAlgebraEditorSource.ui.test.tsx`
  - `npm run test:file-sizes`
  - `git diff --check`
- shared-memory-note: Shared `.memory/current-state.md`, `.memory/decisions.md`, and journal files remain reserved for unrelated dirty work from other agents; this dossier carries the gate evidence for this commit.

### 2026-07-02 - MATRIX-RANK-RREF-EXEC1

- gate: backend
- status: complete
- summary: Matrix editor `rank(...)` and `rref(...)` now dispatch to Matrix-owned exact operations, with replay schema support for rank/RREF and structured system seeds. Exact integer matrices return rank scalars or RREF matrices; non-integer rank/RREF inputs stop with a controlled Matrix error.
- tests:
  - `npm test -- --run src/lib/linear-algebra/matrix.test.ts src/lib/linear-algebra/editor-dispatch.test.ts src/lib/linear-algebra/editor-parser.test.ts src/lib/app-state/history-schema.test.ts src/lib/modes/linear-algebra-worker-runtime.test.ts`
  - `npm run test:ui -- --run src/app/runtime/useLinearAlgebraTableShellRuntime.ui.test.tsx src/app/workspaces/LinearAlgebraEditorSource.ui.test.tsx`
  - `npm run test:file-sizes`
  - `git diff --check`
- shared-memory-note: Shared memory files still contain unrelated dirty work from other agents; this session dossier remains the durable memory artifact for this sequential Matrix/Vector track.
