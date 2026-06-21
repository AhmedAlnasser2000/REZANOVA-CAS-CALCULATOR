# EQUATION-ANSWER-MODE-SIMPLIFICATION1 Completion Report

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors:
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live

## Summary

- Removed `Approx` from active Equation answer-mode controls in Settings and the Equation workspace.
- Kept active settings typed as `exact | isolate`; added legacy compatibility typing for low-level request/history/display surfaces that may still read `approximate`.
- Changed web app-state parsing and Tauri settings sanitization so legacy or invalid `equationAnswerMode: 'approximate'` settings resolve to `exact`.
- Changed new Numeric Interval Solve launches to use an explicit `numericInterval` route with `equationAnswerMode: 'exact'` compatibility context instead of writing `approximate`.
- Kept Numeric Interval Solve contextual: hidden by default, available when already open, available for periodic suggested intervals, and auto-shown only for numeric-solve error advisories.
- Added route-result metadata by tagging successful numeric interval results with `solutionKind: 'approximate-numeric'` without reviving Approx as an answer mode.
- Strengthened missing-value guidance so Numeric Interval Solve names each missing non-target value and points to Variables.

## Behavior Boundaries

- Header `DECIMAL`, approximate digits, numeric notation, and approximate readback remain display-output controls.
- Existing legacy `approximate` request/history/display data remains readable for compatibility.
- No solver capability, OOE authority, Display/History schema, app-state shape beyond settings sanitization, or Exact/Isolate solver semantics were changed.
- Exact symbolic cases such as `\sqrt{2}x=a` preserve symbolic parameters; Numeric Interval Solve asks for missing stored values before numeric root search.

## Files Updated

- `src/types/calculator/mode-types.ts`
- `src/types/calculator/display-types.ts`
- `src/types/calculator/runtime-types.ts`
- `src/lib/app-state/schemas.ts`
- `src/lib/app-state/settings.test.ts`
- `src/lib/modes/equation/types.ts`
- `src/lib/modes/equation/run.ts`
- `src/lib/modes/equation/symbolic.ts`
- `src/lib/modes/equation/parameterized.ts`
- `src/lib/modes/equation/outcomes.ts`
- `src/lib/modes/equation/answer-modes.test.ts`
- `src/lib/modes/equation/stored-values-targets.test.ts`
- `src/lib/equation/equation-inequality.ts`
- `src/lib/equation/inequality/outcome.ts`
- `src/lib/equation/equation-complex.test.ts`
- `src/app/logic/runtimeControllers.ts`
- `src/app/logic/runtimeControllers.test.ts`
- `src/app/runtime/equation-origin-request.ts`
- `src/app/runtime/useEquationRuntime.ts`
- `src/app/runtime/useEquationRuntime.ui.test.tsx`
- `src/app/workspaces/EquationWorkspace.tsx`
- `src/components/SettingsPanel.tsx`
- `src/components/SettingsPanel.ui.test.tsx`
- `src-tauri/src/lib.rs`
- Durable memory files for this milestone.

## Commit Status

- Not committed. User has not requested a commit for this implementation yet.
