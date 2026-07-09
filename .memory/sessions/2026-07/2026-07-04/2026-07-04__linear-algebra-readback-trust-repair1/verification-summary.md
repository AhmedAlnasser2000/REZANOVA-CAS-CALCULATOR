# LINEAR-ALGEBRA-READBACK-TRUST-REPAIR1 Verification Summary

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live

## UI Gate

Passed:

- `npm run test:ui -- src/app/shell/DisplayOutcomeShell.ui.test.tsx src/app/workspaces/LinearAlgebraEditorSource.ui.test.tsx src/app/runtime/useLinearAlgebraTableShellRuntime.ui.test.tsx`
- `npx playwright test e2e/linear-algebra-readback-trust-repair.spec.ts --project=chromium`

Playwright visual evidence inspected:

- `.task_tmp/linear-algebra-readback-trust-repair1/matrix-least-squares-readback.png`
- `.task_tmp/linear-algebra-readback-trust-repair1/matrix-system-readback.png`
- `.task_tmp/linear-algebra-readback-trust-repair1/vector-projection-readback.png`

Observed visual result:

- Matrix least-squares and systems no longer show nonnumeric `APPROX` cards.
- Vector projection no longer shows a nonnumeric `APPROX` card while numeric Vector approximations remain available for scalar results.
- Active Matrix/Vector operand menus render as dark custom controls, so single-letter names remain readable.
- Answer and detail cards for eigen, LU, PLU, coordinates, QR, least squares, diagonalization, systems, Gram-Schmidt, projection, and dot keep natural math readback with no raw `\begin...` title leakage.

## Backend Gate

Passed:

- `npx vitest run src/lib/modes/matrix.test.ts src/lib/modes/vector.test.ts src/lib/linear-algebra/editor-parser.test.ts src/lib/linear-algebra/editor-dispatch-named-values.test.ts`
- `npx vite build`
- `npm run test:file-sizes`
- `npm run test:memory-protocol`
- `git diff --check`

Known unrelated blockers observed during this gate:

- `npx tsc -b --pretty false` stops in the shared checkout on `src/AppMain.tsx(155,8): error TS6133: 'StatisticsScreen' is declared but its value is never read.` This milestone did not edit `src/AppMain.tsx`.
- The same TypeScript run stops on `src/app/workspaces/CalculusLimitEditorSource.ui.test.tsx(313,11): error TS6133: 'approachesInput' is declared but its value is never read.` This is an unrelated dirty Limit test file from another lane.
