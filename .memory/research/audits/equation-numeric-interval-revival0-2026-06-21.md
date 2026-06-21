# EQUATION-NUMERIC-INTERVAL-REVIVAL0

Date: 2026-06-21

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors:
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live

## Scope

Audit the current Numeric Interval Solve route after `EQUATION-ANSWER-MODE-SIMPLIFICATION1`.

No source implementation, solver behavior, UI, schema, OOE, History, app-state, Tauri, or Display changes are included in this audit.

## Semantics Status

The answer-mode semantics track is closed enough to move on.

- Active Equation answer modes are `Exact` and `Isolate`.
- Numeric Interval Solve is no longer an answer mode; it is a contextual numeric route/tool.
- `DECIMAL`, approximate digits, and notation controls remain Display/output controls, not Equation answer modes.
- Numeric results may still use `solutionKind: approximate-numeric`, but that describes the produced result kind, not a persisted answer mode.

The next work should revive the numeric route/tool instead of reopening `Approx` as a third Equation answer mode.

## Source Surface

Runtime and UI launch:

- `src/app/logic/runtimeControllers.ts`
- `src/app/logic/primaryActionRouter.ts`
- `src/app/logic/softActionRouter.ts`
- `src/app/workspaces/EquationWorkspace.tsx`
- `src/app/runtime/useEquationRuntime.ts`

Numeric engine:

- `src/lib/equation/numeric-interval/solve.ts`
- `src/lib/equation/numeric-interval/interval.ts`
- `src/lib/equation/numeric-interval/sampling.ts`
- `src/lib/equation/numeric-interval/trig-guidance.ts`
- `src/lib/equation/guarded/numeric-stage.ts`

Tests already covering part of the surface:

- `src/app/logic/runtimeControllers.test.ts`
- `src/app/runtime/useEquationRuntime.ui.test.tsx`
- `src/lib/equation/numeric-interval/solve.test.ts`
- `src/lib/modes/equation/answer-modes.test.ts`

## Findings

### 1. Numeric launch routing is split and confusing

The Numeric Interval panel has its own `Run Numeric Solve` button, wired through `runEquationNumericSolveAction()`.

The header `Run` button and normal primary/soft action routing still call `runEquationAction()`:

- `primaryActionRouter.ts` calls `deps.runEquationAction()` for Equation work screens.
- `softActionRouter.ts` falls through to `deps.runEquationAction()` for Equation soft actions.
- `DisplayPanel.tsx` header Run calls `onRunEditor`, which is the primary run path.

Result: when the Numeric Interval panel is visible, header `Run` / F1 still performs symbolic Equation solving, not numeric interval solving. This matches the reported UX confusion even if the inner panel button remains separately wired.

First repair candidate: make route selection explicit and test-backed. Either header Run/F1 should stay symbolic with clearer labels, or when the numeric panel/action has focus the primary action should dispatch to `runEquationNumericSolveAction()`.

### 2. The numeric engine is bracket-first and grid-phase sensitive

The current engine:

- parses `start`, `end`, and `subdivisions` with `Number(...)`;
- samples a uniform grid;
- records sample hits, sign brackets, and local-minimum seeds;
- validates candidates against the original equation.

This explains why changing interval endpoints, decimal offsets, or subdivisions can change roots found. Same numeric endpoints such as `-2` and `-2.0` parse the same, but shifting an endpoint to a decimal offset changes the sample grid and can expose or miss roots.

Probe evidence:

| Case | Interval | Result |
| --- | --- | --- |
| `x^2-2=0` | `[-2,2]`, 64 subdivisions | 2 roots |
| `x^2-2=0` | `[-2.0,2.0]`, 64 subdivisions | same 2 roots |
| `x^2-2=0` | `[-1.4,1.4]`, 64 subdivisions | no roots, correctly outside interval |
| `(x-0.3)^2=0` | `[0,1]`, 8 subdivisions | 1 recovered local-minimum root |
| `1/(x-1)=0` | `[0,2]`, 64 subdivisions | no roots |
| `1/(x-1)=0` | `[0.1,2.1]`, 64 subdivisions | one rejected candidate after asymptote-like sign evidence |
| `sin(10x)=0` | `[0,10]`, 64 subdivisions | 32 roots |
| `sin(10x)=0` | `[0.1,10.1]`, 64 subdivisions | 32 roots, shifted set because interval differs |
| `tan(ln(x)+1)=1` | `[0.01,100]`, 256 subdivisions | 2 roots |
| `tan(ln(x)+1)=1` | `[0.01,100]`, 2048 subdivisions | 3 roots |
| `sin(tan(ln(x)+1))=1` | `[1,100]`, 256 subdivisions | 8 roots |
| `sin(tan(ln(x)+1))=1` | `[1.1,100.1]`, 256 subdivisions | 9 roots |
| `sin(tan(ln(x)+1))=1` | `[1,100]`, 2048 subdivisions | 21 roots |

The most important behavior gap is not ordinary polynomial roots; it is dense/nested periodic roots, asymptotes, and narrow branch windows.

### 3. Guidance is stale after answer-mode simplification

The panel says:

- "Use this only when exact symbolic solving stops short."

That is directionally true but too narrow. Numeric Interval Solve is now a route/tool, so the guidance should explain:

- it searches local real roots in the chosen interval;
- it does not prove that all roots were found;
- more subdivisions can reveal additional roots in dense periodic/nested cases;
- intervals crossing discontinuities/domain holes may produce rejected candidates;
- suggested intervals from Exact periodic-family output should be preferred when available.

### 4. Suggested interval handoff is incomplete

Exact/periodic outcomes can expose `periodicFamily.suggestedIntervals`, and the UI uses those advisories to allow/show the Numeric Solve panel. But the current panel does not clearly show why the suggested interval exists, does not present selectable suggestions, and does not prefill from a chosen suggestion.

For nested periodic boundaries, the result card can say "Use Numeric Solve with one of the suggested intervals" while the panel still presents generic start/end/subdivision fields. That makes the path feel unfinished.

### 5. Tests prove old behavior but not the renewed product contract

Existing tests cover:

- basic numeric interval success;
- angle-unit handling;
- local-minimum recovery;
- invalid interval rejection;
- some trig/abs guidance;
- OOE numeric-pilot commit and stale-drop behavior.

Missing tests for the revived contract:

- UI/header route selection when the Numeric Interval panel is visible or focused;
- panel button end-to-end launch from `EquationWorkspace`;
- suggested interval display/prefill;
- decimal endpoint equivalence for identical numeric values (`1` vs `1.0`);
- grid-phase/subdivision sensitivity evidence for dense/nested periodic families;
- discontinuity/rejected-candidate guidance;
- no-root versus "insufficient sampling" wording.

## Recommended Implementation Sequence

### 1. `EQUATION-NUMERIC-INTERVAL-ROUTE-REPAIR1`

First repair the product contract and launch routing.

Scope:

- Decide and implement how header Run/F1 behaves when Numeric Interval Solve is visible or focused.
- Add tests proving the panel button launches numeric OOE work.
- Add route labels/guidance so users understand whether they are running Exact/Isolate or Numeric Interval.
- Keep Numeric Interval as a route/tool, not an answer mode.

Out of scope:

- No adaptive sampling yet.
- No broader solver capability.
- No schema or OOE authority changes.

### 2. `EQUATION-NUMERIC-INTERVAL-GUIDANCE1`

Upgrade wording and suggestion handoff.

Scope:

- Explain local real search, limitations, candidate validation, domain holes, and subdivisions.
- Surface suggested intervals from periodic-family results as selectable/prefillable options.
- Improve no-root/rejected-candidate messages.

### 3. `EQUATION-NUMERIC-INTERVAL-STABILITY1`

Improve numeric behavior with test-backed stability.

Scope:

- Reduce grid-phase fragility for dense/nested periodic cases.
- Add discontinuity-aware sampling/guidance.
- Add branch-window refinement or adaptive subdivision where evidence supports it.
- Preserve candidate validation against the original equation.

## Commit Gate

This audit is intentionally left uncommitted until the user asks.
