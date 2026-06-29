# Calculus Derivative UX Audit

Status: audit

Milestone: `CALCULUS-DERIVATIVE-UX-AUDIT0`

Purpose: map the current derivative and derivative-at-point user experience before implementing the main-editor and single-result cleanup. This audit is documentation only; it does not change runtime behavior, UI behavior, solver behavior, Display scheduling, OOE, History, Tauri, persistence, schemas, worker hosts, capability ids, or public result contracts.

## Summary

The current guided Calculus derivative screens are behind the newer integral and Laplace editor-source model.

Integrals and Laplace already use the main Display editor as the body/source editor. Derivative and derivative-at-point still use lower workspace `secondary-mathfield` editors, then generate a derivative request preview that can compete visually with the structured Display result.

The next implementation slice should first make derivative body editing use the main editor, then remove the duplicate-feeling answer presentation. Solver route/cost control should follow after the UX source is stable.

## Current User-Facing Problems

- Derivative expression entry happens in a lower "Derivative Body" card instead of the main editor.
- Derivative-at-point expression entry also happens in a lower math field, while only the point is a normal control.
- The generated derivative preview reads like another primary result surface.
- The top Display area can show derivative math while the structured `Answer` card also shows derivative math, making one computed result look duplicated.
- F2/To Editor behavior sends the generated derivative request to another editor path instead of focusing the derivative body editor in place.
- The guided Calculus derivative experience therefore feels less direct than the already-cleaned integral experience.

## Current Ownership Map

### Workspace UI

- `src/app/workspaces/CalculusWorkspace.tsx`
  - Derivative screen renders a lower `MathEditor` with `className="secondary-mathfield"` and label `Derivative Body`.
  - Derivative-at-point renders a lower `MathEditor` with `className="secondary-mathfield"` plus a `SignedNumberDraftInput` for the point.
  - Both screens render `GeneratedPreviewCard` with `onToEditor={onLoadWorkbenchToEditor}` and `onCopyExpr={onCopyWorkbenchExpression}`.
  - Integral screens no longer render body `secondary-mathfield` editors; they keep controls plus a generated request preview.

### Main Editor Source

- `src/app/runtime/useCalculusRuntime.ts`
  - `calculusIntegralEditorActive` is true only for integral screens and `laplace`.
  - `calculusIntegralEditorLatex` exposes only integral bodies and Laplace `f(t)` to the main editor.
  - `setCalculusIntegralEditorLatex()` writes only integral/Laplace body state.
  - Derivative and derivative-at-point body state exists in the same runtime hook but is not included in the main-editor source path.

- `src/app/shell/display-panel/DisplayEditorSurface.tsx`
  - When `calculusIntegralEditorActive` is true, the main editor renders as a Calculus `MathEditor`.
  - When it is false and the current mode is Calculus, the display falls back to a `display-standby` `MathStatic` surface.
  - This explains why derivative screens do not get the main editor editing model.

### Generated Request And Active Expression

- `src/app/runtime/calculus-origin-request.ts`
  - `buildCalculusWorkbenchExpression()` builds derivative generated LaTeX from `buildDerivativeLatex()` and `buildDerivativeAtPointLatex()`.
  - Generated derivative requests are still useful for Copy Expr, History request context, replay inference, and OOE input revision evidence.

- `src/AppMain.tsx`
  - `displayInputLatex` uses `calculusIntegralEditorLatex` only when `calculusIntegralEditorActive` is true; otherwise it uses `calculusWorkbenchExpression`.
  - `activeExpressionLatex()` returns the generated Calculus workbench expression for all non-menu Calculus screens.
  - `editActiveExpression()` focuses the Calculus main editor only when `calculusIntegralEditorActive` is true; otherwise it loads the generated expression into the generic editor routing path.
  - `loadCalculusToEditor` follows the same split: focus integral editor if active, otherwise load the generated workbench expression elsewhere.

### Focus Routing

- `src/app/logic/focusRouting.ts`
  - Derivative focus targets `derivativeFieldRef`.
  - Derivative-at-point focus targets `derivativePointFieldRef`.
  - Indefinite, definite, improper integral, and Laplace screens focus `mainFieldRef`.

- `src/app/runtime/useShellFocusRuntime.ts`
  - Repeats the same focus distinction for shell-level focus behavior.

### Runtime Evaluation

- `src/lib/calculus/workspace/engine.ts`
  - Guided Calculus derivative and derivative-at-point cases build generated derivative LaTeX.
  - They then delegate to `runCalculateMode()` with `calculateScreen: 'derivative'` or `calculateScreen: 'derivativePoint'`.
  - This preserves existing derivative behavior but means guided Calculus does not yet own a dedicated derivative route/preflight layer.

- `src/lib/modes/calculus.ts`
  - The public Calculus mode facade still runs through `calculus.evaluate` with the existing Calculus worker/fallback host policy.
  - No derivative UX cleanup should change the capability id, worker host identity, OOE pilot, or generated input revision contract.

### Display Result Surfaces

- `src/app/shell/DisplayPanel.tsx`
  - Passes `suppressExpressionPreview={calculusIntegralEditorActive}` to `DisplayPreviewSurface`.
  - Derivative screens do not suppress the expression preview because they are not currently in the main-editor source set.

- `src/app/shell/display-panel/DisplayPreviewSurface.tsx`
  - Shows a preview card for `deferredDisplayLatex` when not suppressed.
  - For derivative screens, this preview can show the generated derivative request with Copy/Edit/Paste actions.

- `src/app/shell/display-panel/DisplayResultBlocks.tsx`
  - The structured result `Answer` block is the normal Display answer owner.
  - The apparent duplicate answer is a presentation/source problem, not evidence that the solver produced two answers.

## Current Contrast With Integrals

`CALCULUS-INTEGRALS-EDITOR-SOURCE1` already set the pattern this audit recommends for derivatives:

- The main editor owns the expression body.
- The lower workspace owns controls and generated request preview.
- F2 means `Focus Editor`.
- Copy Expr copies the generated request.
- Copy Result copies the structured result.
- The `Answer` block remains the only result rendering.

Derivative cleanup should follow this shape unless implementation finds a hard mismatch.

## Next Implementation Recommendation

### `CALCULUS-DERIVATIVE-EDITOR-SOURCE1`

Recommended first behavior slice:

- Rename the main-editor state surface from integral-specific wording to a calculus body editor concept, or add a small derivative-aware adapter if a rename touches too many files.
- Include `derivative` and `derivativePoint` in the Calculus main-editor source set.
- Make the main editor value be the raw derivative body, not the generated `\frac{d}{dx}` request.
- Keep derivative-at-point's numeric point as a lower workspace control.
- Remove the derivative lower body `secondary-mathfield` editors from `CalculusWorkspace`.
- Preserve generated derivative request LaTeX for Copy Expr, runtime launch evidence, History context, and OOE input revision.
- Make F2/To Editor focus the main editor for derivative and derivative-at-point screens.
- Add UI coverage mirroring `src/app/workspaces/CalculusIntegralEditorSource.ui.test.tsx`.

### `CALCULUS-DERIVATIVE-SINGLE-RESULT1`

Recommended second behavior slice:

- Keep the structured Display `Answer` block as the derivative answer owner.
- Suppress expression preview on derivative screens once the body lives in the main editor, matching integrals.
- Ensure the top Display area shows body/request context rather than a second answer.
- Keep Copy Expr and Copy Result distinct.
- Do not change public Display block schemas.

### `SYMBOLIC-DIFFERENTIATION-PREFLIGHT1`

Recommended follow-up after UX cleanup:

- Add a derivative route/cost classifier before higher derivatives or mixed partials.
- Classify direct symbolic, supported but costly, Compute Engine fallback, unsupported, malformed, and over-budget cases.
- Keep route evidence internal/test-facing first unless a later milestone approves visible metadata.

## Implementation Boundaries

Do not do these inside the UX source cleanup:

- Do not change `calculus.evaluate`.
- Do not rename or broaden worker host identities.
- Do not collapse Calculate and Calculus runtime ownership.
- Do not change History schema or persisted replay fields.
- Do not change public Display block schemas.
- Do not add higher-order derivatives, mixed partials, implicit differentiation, or route/cost classification in the editor-source slice.
- Do not change derivative math behavior while moving the input source.

## Cross-Agent Caution

At audit time, the worktree has unrelated dirty work in algebra, Equation, and Risch-Norman integration files. The derivative UX implementation should avoid those lanes and should re-check `git status --short` before editing because other agents are active.

The likely first implementation files are under:

- `src/app/runtime/useCalculusRuntime.ts`
- `src/app/shell/display-panel/DisplayEditorSurface.tsx`
- `src/app/shell/DisplayPanel.tsx`
- `src/app/logic/focusRouting.ts`
- `src/app/runtime/useShellFocusRuntime.ts`
- `src/AppMain.tsx`
- `src/app/workspaces/CalculusWorkspace.tsx`
- focused Calculus derivative editor-source UI/runtime tests

`src/app/shell/DisplayPanel.ui.test.tsx` has recently been dirty in other-agent work, so prefer a derivative-specific UI test file if the worktree is still active.
