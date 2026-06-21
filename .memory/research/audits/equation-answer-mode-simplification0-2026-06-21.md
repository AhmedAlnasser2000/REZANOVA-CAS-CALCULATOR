# EQUATION-ANSWER-MODE-SIMPLIFICATION0

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

Audit-only milestone for the user-approved Equation answer-mode simplification.

Decision direction:

- Active Equation answer modes should be `Exact` and `Isolate`.
- The existing header `DECIMAL` / numeric output controls remain display-output style, not Equation answer modes.
- Numeric interval solving should remain available as an explicit contextual numeric route, but it should no longer be presented as the ordinary `Approx` answer mode.
- The previous uncommitted `EQUATION-ANSWER-SEMANTICS-TAGS1` source/test slice was removed from the worktree before commit because it reinforced `approximate` as an answer-mode setting.

No source code, solver behavior, schemas, UI, OOE, Display, History, app-state, Tauri, or tests were changed by this audit.

## Current Repo Evidence

| Surface | Current state | Audit consequence |
| --- | --- | --- |
| `src/types/calculator/mode-types.ts` | `EquationAnswerMode = 'exact' | 'approximate' | 'isolate'` | Implementation must narrow the active setting contract to Exact/Isolate while keeping compatibility for old data. |
| `src/lib/app-state/schemas.ts` | settings schema accepts `approximate` as persisted `equationAnswerMode` | Web preview persistence needs a migration/sanitizer from legacy `approximate` to the new default, likely `exact`. |
| `src-tauri/src/lib.rs` | desktop sanitizer/save_settings accepts `approximate` | Tauri persistence must match the web sanitizer and coerce legacy/invalid values to `exact`. |
| `src/components/SettingsPanel.tsx` | Settings renders `Exact`, `Approx`, `Isolate` chips | Settings should remove the `Approx` answer-mode chip; numeric output controls remain separate. |
| `src/app/workspaces/EquationWorkspace.tsx` | Symbolic workspace renders `Exact`, `Approx`, `Isolate` and auto-shows numeric panel when `answerMode === 'approximate'` | Workspace should render only `Exact` and `Isolate`; numeric interval controls should be contextual and not tied to answer-mode selection. |
| `src/app/logic/runtimeControllers.ts` | normal Run attaches `numericInterval` only when `equationAnswerMode === 'approximate'`; explicit `runEquationNumericSolveAction` also submits `equationAnswerMode: 'approximate'` | Numeric interval solve should become route/action metadata instead of an answer-mode value. |
| `src/lib/modes/equation/run.ts` | Approximate mode validates interval and missing stored numeric parameters before numeric solve | That validation remains useful, but should be owned by the numeric route, not by the persisted answer-mode contract. |
| `src/app/runtime/useEquationRuntime.ts` / History | replay and history metadata infer or persist `approximate` for numeric interval entries | Existing history needs compatibility: legacy `approximate` entries should replay as numeric-interval route records, not resurrect an active Approx answer mode. |

## Findings

1. `Approx` currently merges two different ideas:
   - an answer-mode choice beside `Exact` and `Isolate`;
   - an explicit bracketed numeric interval solve route.

   That is why the UI feels blurry. Numeric interval solving is real functionality, but it is not the same kind of contract as symbolic exact solving or selected-target rearrangement.

2. `Numeric Interval Solve` is too visible today.

   `shouldAllowEquationNumericSolve()` can return true before there is an Equation result or exact failure, so an ordinary symbolic equation screen can show a generic numeric-solve affordance. The panel also auto-renders whenever `answerMode === 'approximate'`. This makes interval solving feel like a universal next step rather than a contextual fallback/tool.

3. Removing the `Approx` answer mode does not mean deleting numeric solving.

   The explicit controller action `runEquationNumericSolveAction()` and guarded numeric stage are the useful parts to preserve. They should become a contextual route/tool, invoked from relevant advisories, suggested intervals, or an explicit advanced/fallback affordance.

6. Cleanup status after audit discussion.

   The old uncommitted `EQUATION-ANSWER-SEMANTICS-TAGS1` source/test changes were cleared from the worktree. The audit/memory direction remains so `EQUATION-ANSWER-MODE-SIMPLIFICATION1` can start from committed source plus the new two-mode boundary.

4. `SolutionKind` can still distinguish numeric results, but not as an answer-mode selector.

   `approximate-numeric` may remain a result classification for successful numeric interval solves if later implementation keeps that vocabulary. It should not imply a persisted `equationAnswerMode: 'approximate'` setting.

5. Output style remains separate.

   Header `DECIMAL` / Settings approximate digits / numeric notation controls are display-output controls. They can show decimal companions for exact symbolic answers and should not be removed as part of Equation answer-mode simplification.

## Recommended Implementation Milestone

`EQUATION-ANSWER-MODE-SIMPLIFICATION1`

Scope:

- Remove `Approx` from active Equation answer-mode UI in `EquationWorkspace` and `SettingsPanel`.
- Narrow the active `EquationAnswerMode` contract to Exact/Isolate for settings and ordinary symbolic runs.
- Migrate/sanitize legacy persisted `equationAnswerMode: 'approximate'` to `exact` in web and Tauri settings.
- Keep history/schema compatibility for older entries that already carry `equationAnswerMode: 'approximate'`.
- Keep numeric interval solve as an explicit route/action, not a normal answer mode.
- Rework runtime/history metadata so numeric interval solves are identified by `numericInterval` / route kind / solve badge rather than by an active Approx answer-mode setting.
- Make `Numeric Solve` hidden by default and show it only when context supports it:
  - exact symbolic solving stops with a numeric-solve advisory;
  - a periodic/composition route offers suggested intervals;
  - the user explicitly opens a fallback/advanced numeric solve affordance.
- Keep missing-parameter guidance from the uncommitted tagging slice: identify exact missing non-target values and point users to Variables.
- Preserve `Exact` and `Isolate` behavior while tightening their definitions:
  - `Exact`: solved symbolic/evidence-backed answers, including irrational radicals and symbolic-parameter formulas when representable.
  - `Isolate`: rearranged selected-target formulas or relations, with Valid When facts when rearrangement introduces conditions.

Out of scope:

- Removing display `DECIMAL`.
- Removing numeric interval solve itself.
- Broad UI redesign, graphing, step-by-step, OOE changes, solver algorithm expansion, cap changes, Display/History schema changes, Tauri command shape changes beyond settings sanitization, or source-mirror parity work.

## Compatibility Notes

- Old persisted settings with `equationAnswerMode: 'approximate'` should not break boot. They should resolve to `exact`.
- Old History entries with `numericInterval` and/or `equationAnswerMode: 'approximate'` should remain readable and replayable as numeric interval solves.
- OOE input revision and history ticket behavior should preserve current stale/cancel/commit semantics when numeric interval solve becomes a route action instead of answer-mode state.
- Existing tests around inequality guidance that mention Approximate will need rewriting once Approximate is no longer an answer mode.

## Test Targets For The Implementation

- Settings/app-state/Tauri:
  - legacy `approximate` settings sanitize to `exact`;
  - invalid settings sanitize to `exact`;
  - Settings no longer renders the `Approx` answer-mode chip.
- Workspace UI:
  - Answer mode shows only `Exact` and `Isolate`;
  - numeric interval panel is hidden by default for ordinary symbolic equations;
  - contextual numeric-solve advisories can reveal the panel.
- Runtime:
  - ordinary Run never attaches `numericInterval` because of answer mode;
  - explicit numeric solve still sends interval data, real domain intent, and stored-value substitution snapshot;
  - missing stored numeric values name exact symbols and point to Variables.
- History/replay:
  - old approximate/numeric interval entries load;
  - numeric interval entries replay as numeric route entries;
  - result metadata does not revive an active Approx answer mode.
- Answer semantics:
  - Exact successes tag or report exact-symbolic semantics;
  - Isolate successes tag or report isolate-formula semantics;
  - numeric interval successes may remain `approximate-numeric` as route-result semantics, not as answer-mode semantics.

## Verification

- Audit-only verification:
  - `npm run test:memory-protocol`
  - `git diff --check`

## Commit Status

- No commit was made. User explicitly requested no commit.
