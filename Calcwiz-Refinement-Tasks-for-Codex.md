# Calcwiz Desktop — Refinement Tasks for Codex

## Context

Calcwiz is a Casio-style scientific calculator (Tauri + React + TypeScript) with 10+ math modes, an app-owned symbolic engine over Compute Engine, and MathLive for textbook input. The math/logic layer is strong (66 test files, excellent type discipline), but the project has accumulated structural debt:

- A **9,907-line monolithic** `App.tsx`
- **25 duplicated** `ComputeEngine` singletons
- Repeated utility functions across modules
- Dead Rust stub commands
- Zero UI/e2e tests

Below are **12 self-contained tasks** you can hand to Codex, ordered by recommended execution.

---

## Recommended Execution Order

Do safe library refactors and pure test additions first (1–6), then component extractions (7–10), then the more nuanced tasks (11–12).

| #  | Task                                                      | Risk        | Codex-Safe?          | Impact                    |
|----|-----------------------------------------------------------|-------------|----------------------|---------------------------|
| 1  | Consolidate `box()`/`boxLatex()`/`isFiniteNumber()` + CE | Low         | Yes                  | Dedup ~20 files           |
| 2  | Consolidate LaTeX parse helpers                           | Low         | Yes                  | Dedup 2 files             |
| 3  | Add tests for `format.ts`                                 | None        | Yes                  | Test coverage             |
| 4  | Add tests for `core-mode`, `symbolic-factor`, `discrete`  | None        | Yes                  | Test coverage             |
| 5  | Add tests for `matrix.ts` and `vector.ts`                 | None        | Yes                  | Test coverage             |
| 6  | Add tests for `calculus-eval.ts`                          | None        | Yes                  | Test coverage             |
| 7  | Extract `<TrigonometryWorkspace>`                         | Medium      | Yes, needs UI check  | -600 lines from App.tsx   |
| 8  | Extract `<StatisticsWorkspace>`                           | Medium      | Yes, needs UI check  | -500 lines from App.tsx   |
| 9  | Extract `<GeometryWorkspace>`                             | Medium      | Yes, needs UI check  | -700 lines from App.tsx   |
| 10 | Extract `<EquationWorkspace>`                             | Medium-High | Yes, needs UI check  | -400 lines from App.tsx   |
| 11 | Remove/document 5 Rust stub commands                      | Low         | Needs human decision | Dead code cleanup         |
| 12 | Custom hooks for mode-specific state                      | High        | Needs human review   | Architecture improvement  |

---

## Task 1: Consolidate Duplicated Utility Functions Into a Shared Module

**Risk: Low | Fully Codex-safe**

`box()` is copy-pasted **7 times**, `boxLatex()` **5 times**, `isFiniteNumber()` **5 times**. Canonical exports already exist in `src/lib/symbolic-engine/patterns.ts` but other files define private copies.

### Instructions

1. Create `src/lib/ce-shared.ts` that exports a single `const ce = new ComputeEngine()` and a `box(node)` wrapper.
2. Re-export `isFiniteNumber`, `boxLatex`, `isNodeArray` from `symbolic-engine/patterns.ts`.
3. Update `patterns.ts` to import `ce` from `ce-shared.ts` instead of creating its own.
4. In every file that has a local `box()`, `boxLatex()`, or `isFiniteNumber()` — delete the local copy and import from the shared module.
   - Files: `calculus-eval.ts`, `advanced-calc/{integrals,limits,ode,series}.ts`, `semantic-planner.ts`, `symbolic-engine/limits.ts`, `antiderivative-rules.ts`, `trigonometry/{identities,normalize,equation-match}.ts`, `limit-heuristics.ts`.
5. Also replace each file's local `const ce = new ComputeEngine()` with the shared import. This touches ~20 source files. Test files may keep their own instances.
6. Run `npm run test` and `npm run build` — all must pass.

---

## Task 2: Consolidate Duplicated LaTeX Parse Helpers

**Risk: Low | Fully Codex-safe**

`collectCommand()`, `matchingCloseFor()`, and `collectBalancedSegment()` are duplicated between `src/lib/input-canonicalization.ts` and `src/lib/semantic-planner.ts`.

### Instructions

1. Create `src/lib/latex-parse-helpers.ts` exporting the three functions.
2. Delete the local copies in both consumer files; import from the new module.
3. Create `src/lib/latex-parse-helpers.test.ts` with unit tests (LaTeX commands, balanced braces/parens, nested groups).
4. Run `npm run test` — all must pass.

---

## Task 3: Add Unit Tests for `format.ts`

**Risk: None | Fully Codex-safe**

`src/lib/format.ts` exports `formatNumber`, `numberToLatex`, `scalarToLatex`, `matrixToLatex`, `vectorToLatex` — all untested.

### Instructions

1. Create `src/lib/format.test.ts`.
2. Test: positive/negative/zero, near-zero normalization, Infinity, NaN, fractional precision, matrix `\begin{bmatrix}` output, vector output.
3. Run `npm run test`.

---

## Task 4: Add Unit Tests for `core-mode.ts`, `symbolic-factor.ts`, `discrete-eval.ts`

**Risk: None | Fully Codex-safe**

Three small but important modules with zero test coverage.

### Instructions

1. Create `src/lib/core-mode.test.ts` — test `createCoreDraftState()` defaults and `isCoreDraftEditable()`.
2. Create `src/lib/symbolic-factor.test.ts` — test `factorMathJson()` with a factorable polynomial (e.g., x²−1) and an unfactorable expression.
3. Create `src/lib/discrete-eval.test.ts` — read the file first, then test all exported functions.
4. Run `npm run test`.

---

## Task 5: Add Unit Tests for `matrix.ts` and `vector.ts`

**Risk: None | Fully Codex-safe**

The linear algebra modules have zero test files.

### Instructions

1. Create `src/lib/matrix.test.ts` — add, subtract, multiply, transpose, determinant (2×2, 3×3), inverse (invertible + singular error case).
2. Create `src/lib/vector.test.ts` — dot product, cross product, norm, angle between vectors, add, subtract, zero-vector edge cases.
3. Run `npm run test`.

---

## Task 6: Add Unit Tests for `calculus-eval.ts`

**Risk: None | Fully Codex-safe**

The core calculus evaluation pipeline (derivatives, integrals, limits from Calculate mode) has zero tests.

### Instructions

1. Create `src/lib/calculus-eval.test.ts`.
2. Cover: polynomial derivative, trig derivative, derivative at a point, basic antiderivative, definite integral, finite limit, infinite limit, directional limits, empty/malformed input errors.
3. Run `npm run test`.

---

## Task 7: Extract `<TrigonometryWorkspace>` from App.tsx

**Risk: Medium | Needs manual UI verification after**

Easiest extraction — `renderTrigonometryWorkspace()` (line ~6191, ~525 lines) already exists as a natural boundary. Trig mode has 11 `useState` hooks and ~30 helper functions.

### Instructions

1. Create `src/components/TrigonometryWorkspace.tsx`.
2. Define a `TrigonometryWorkspaceProps` interface accepting:
   - All trig-specific state + setters
   - Shared deps: `angleUnit`, `outputStyle`, `currentMode`, `isLauncherOpen`
   - Callbacks: `commitOutcome`, `openGuideArticle`, `openGuideMode`
   - Refs: `trigMenuPanelRef`, `trigEditorRef`
3. Move `renderTrigonometryWorkspace()`, `renderTrigonometryPreviewCard()`, and all trig-only helper functions (e.g., `updateTrigDraft`, `loadTrigDraft`, `runTrigAction`, `openTrigScreen`, navigation helpers) into the component.
4. In `App.tsx`, replace the inline trig render call with `<TrigonometryWorkspace ...props />`.
5. Keep the `useState` hooks in `App.tsx` for now (passed as props). Moving them is Task 12.
6. Run `npm run build`.

---

## Task 8: Extract `<StatisticsWorkspace>` from App.tsx

**Risk: Medium | Needs manual UI verification after**

Second easiest — `renderStatisticsWorkspace()` (line ~5882, ~287 lines) is a natural boundary. Statistics mode has ~13 `useState` hooks.

### Instructions

1. Create `src/components/StatisticsWorkspace.tsx`.
2. Same pattern as Task 7: props interface for all stats state + setters, shared deps, callbacks.
3. Move `renderStatisticsWorkspace()` and all statistics-specific helpers into the component.
4. Replace the inline render call in `App.tsx`.
5. Run `npm run build`.

---

## Task 9: Extract `<GeometryWorkspace>` from App.tsx

**Risk: Medium | Needs manual UI verification after**

Third easiest — `renderGeometryWorkspace()` (line ~6742, ~781 lines) is a natural boundary. Geometry has 18 `useState` hooks.

### Instructions

1. Create `src/components/GeometryWorkspace.tsx`.
2. Same pattern as Tasks 7–8.
3. Move `renderGeometryWorkspace()`, `renderGeometryPreviewCard()`, and all geometry-specific helpers.
4. Replace the inline render call in `App.tsx`.
5. Run `npm run build`.

**After Tasks 7–9:** App.tsx drops from ~9,900 lines to roughly ~7,500 lines.

---

## Task 10: Extract `<EquationWorkspace>` from App.tsx

**Risk: Medium-High | Needs manual UI verification after**

Harder than 7–9 because there is no pre-existing `renderEquationWorkspace()` helper. The equation JSX block must be identified from the `currentMode === 'equation'` conditional.

### Instructions

1. Create `src/components/EquationWorkspace.tsx`.
2. Identify all equation-specific `useState` hooks: `equationScreen`, `equationMenuSelection`, polynomial coefficients, simultaneous system state.
3. Identify all equation-only functions: `openEquationScreen`, `runEquationAction`, `setPolynomialCoefficient`, `setSystemCell`, navigation helpers.
4. Extract the JSX block and helpers into the new component.
5. Run `npm run build`.

---

## Task 11: Remove or Document the 5 Rust Stub Commands

**Risk: Low | Needs human decision (remove vs. document)**

`evaluate_math`, `solve_expression`, `matrix_command`, `vector_command`, `generate_table` in `src-tauri/src/lib.rs` return `frontend_engine_warning()` and do nothing.

### Instructions

1. Search the TypeScript codebase for `invoke('evaluate_math')`, `invoke('solve_expression')`, etc. to check if they're actually called.
2. If **never called**: remove the 5 stub functions and their `generate_handler![]` registrations. Also remove `frontend_engine_warning()` if unused after.
3. If **called**: add a doc comment to each:
   ```
   /// V1 stub — CAS handled by TypeScript symbolic adapter.
   /// Will be replaced when CAS moves to Rust.
   ```
4. Run `cargo check` in `src-tauri/` to confirm Rust compilation.

---

## Task 12: Introduce Custom Hooks for Mode-Specific State (Follow-up to 7–9)

**Risk: High | Needs careful human review of cross-mode interactions**

Even after component extraction, App.tsx still owns ~67 `useState` hooks. Each mode's state should move into a co-located custom hook.

### Instructions (pilot with Trigonometry)

1. Create `src/hooks/useTrigonometryState.ts` encapsulating the 11 trig `useState` hooks.
2. Call it inside `TrigonometryWorkspace.tsx` instead of receiving individual state props.
3. For cross-mode seeding (Guide examples -> Trig, history replay), expose a `seed(state)` method via `useImperativeHandle` on the workspace component.
4. Remove the trig `useState` hooks from `App.tsx`.
5. Run `npm run build` and `npm run test`.
6. Repeat for Statistics and Geometry as separate sub-tasks.

---

## Verification Checklist

After **every** task, run:

- [ ] `npm run test` — all 66+ test files must pass
- [ ] `npm run build` — TypeScript compilation must succeed
- [ ] For Tasks 7–10, 12: manually open the app (`npm run dev`) and verify the affected mode works (menu navigation, input, evaluation, cross-mode actions like "Send to Calculate")

---

## Critical Files Reference

| File                                  | Lines  | Relevant Tasks |
|---------------------------------------|--------|----------------|
| `src/App.tsx`                         | 9,907  | 7–10, 12       |
| `src/types/calculator.ts`            | 1,408  | All extractions |
| `src/lib/symbolic-engine/patterns.ts` | —      | 1              |
| `src/lib/semantic-planner.ts`        | —      | 1, 2           |
| `src/lib/input-canonicalization.ts`  | —      | 2              |
| `src-tauri/src/lib.rs`              | ~1,000 | 11             |
