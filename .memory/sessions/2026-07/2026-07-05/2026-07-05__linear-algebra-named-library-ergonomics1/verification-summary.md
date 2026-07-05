## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5-codex
- contributors: user
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5-codex
- verified_by_agent: codex
- verified_by_agent_model: gpt-5-codex
- attribution_basis: live

## Verification

- `npx vitest run --config vitest.ui.config.ts src/app/workspaces/LinearAlgebraEditorSource.ui.test.tsx --reporter=dot`
  - passed: Matrix/Vector named library add, rename, duplicate, delete, card actions, active operands, and F-key labels.
- `npx vitest run --config vitest.ui.config.ts src/app/runtime/useLinearAlgebraTableShellRuntime.ui.test.tsx --reporter=dot`
  - passed: runtime registry ids, add/duplicate active operand behavior, and existing Linear Algebra runtime regressions.
- `npx vitest run --config vitest.ui.config.ts src/app/workspaces/LinearAlgebraEditorSource.ui.test.tsx src/app/runtime/useLinearAlgebraTableShellRuntime.ui.test.tsx src/app/runtime/useLinearAlgebraNamedReplay.ui.test.tsx --reporter=dot`
  - passed: 22 UI/runtime tests including named replay.
- `npx vitest run src/lib/linear-algebra/runtime-request.test.ts src/app/runtime/useLinearAlgebraNamedReplay.ui.test.tsx --reporter=dot`
  - passed the matching non-UI Linear Algebra facade test selected by the default Vitest include.
- `npx playwright test e2e/linear-algebra-named-library-ergonomics.spec.ts`
  - passed: Matrix and Vector library visual smoke, duplicate-name feedback, card active actions, active soft keys, and result cards.
  - screenshots: `.task_tmp/linear-algebra-named-library-ergonomics1/matrix-library-duplicate-name-feedback.png`
  - screenshots: `.task_tmp/linear-algebra-named-library-ergonomics1/matrix-library-active-result-card.png`
  - screenshots: `.task_tmp/linear-algebra-named-library-ergonomics1/vector-library-duplicate-name-feedback.png`
  - screenshots: `.task_tmp/linear-algebra-named-library-ergonomics1/vector-library-active-result-card.png`
- `npx playwright test e2e/linear-algebra-paste-naturalization.spec.ts e2e/linear-algebra-readback-trust-repair.spec.ts --grep "keyboard paste naturalizes Matrix|Vector paste naturalizes|Matrix readback cards|Vector readback"`
  - first run passed 3 of 4 cases and hit a transient Vector Approx-card expectation failure.
- `npx playwright test e2e/linear-algebra-readback-trust-repair.spec.ts --grep "Vector readback keeps"`
  - passed on rerun.
- `npx vitest run --config vitest.ui.config.ts src/app/workspaces/CalculusDerivativeEditorSource.ui.test.tsx -t "uses derivative keypad templates" --reporter=dot`
  - passed: derivative keypad overlay remains scoped to derivative screens.
- `npm run test:compartments-boundaries`
  - passed.
- `npm run test:ooe-boundaries`
  - passed.
- `npm run test:file-sizes`
  - passed.
- `git diff --check`
  - passed.

## External Blockers

- `npx tsc -b --pretty false` failed outside this lane in dirty Equation complex-region work: `src/lib/modes/equation/complex-region-subdivision.ts` is missing `zerosMinusPoles`, `knownPoleCount`, and `poleDiagnosticCount` fields required by `ComplexContourWindingResult`.
- `npm run build` failed for the same unrelated TypeScript errors before Vite could build.
- The full derivative UI suite currently has an unrelated failure in `previews and evaluates higher-order natural derivative requests`: expected `d³/dt³`, received `d/dx`.
- Playwright visual checks for this milestone used a Vite dev server on `127.0.0.1:4173` because the unrelated TypeScript blocker prevented a production build.
