# AppMain Orchestrator Surface Audit

Status: audit with `APPMAIN-HISTORY-DISPLAY-SHELL1` split record

Purpose: document the remaining `src/AppMain.tsx` orchestration surface after the Calculate, Calculus, Equation, Guide, Geometry, Statistics, Trigonometry, Linear Algebra/Table, OOE, Modes, Engine, Symbolic Engine, Algebra, Equation, and CSS district work. This audit is documentation only; it does not move code.

## Current Snapshot

- `src/AppMain.tsx`: 3357 lines after `APPMAIN-HISTORY-DISPLAY-SHELL1`.
- `src/app/runtime/useHistoryDisplayRuntime.ts`: 405 lines.
- `src/app/runtime/historyDisplayEntry.ts`: 141 lines.
- `src/app/runtime/useEquationRuntime.ts`: 857 lines, under the 900-line ratchet after `APPMAIN-EQUATION-RUNTIME1`.
- `src/app/shell/DisplayPanel.tsx`: 1590 lines and now the largest visible app-shell component adjacent to AppMain.
- `src/app/logic/appFlowHandlers.ts`: 1362 lines, `@ts-nocheck`, and not imported by current first-party code.
- `src/app/logic/modeActionHandlers.ts`, `modeGuideRouting.ts`, `focusRouting.ts`, and `solveSummary.ts` also appear to have no current first-party imports in the local inspection.

## Current AppMain Responsibilities

Stable orchestration roots:

- Global app mode state, previous non-Guide mode, launcher state handoff, and current visible workspace selection.
- Settings, persisted mode, hydration, calculator-memory restore/reset, variable memory, clipboard notices, and ANS state.
- Shared `displayOutcome`, Display header/input derivation, editor-analysis status, result badges, active algebra-transform tray selection, and DisplayPanel prop assembly.
- History list, pending History tickets, History launch ordering, pending-job Stop requests, final History append, History replay dispatch, and History/Display commit coupling.
- Cross-mode transfers: Guide examples, send-to-Calculate, send-to-Equation, prompt auto-switch to Equation, Display outcome actions, and legacy Calculate-calculus mapping.
- Global editor shell: active MathLive field refs, insert/paste/copy helpers, editor Stop/Restart, preview analysis, Calculate transform eligibility, and active-expression routing.
- Global command routing: primary action, soft action, keypad layer/routing, physical modifier layers, and window keydown/keyup handling.
- Side surfaces and left inspector rendering: Settings, History, Variables, OOE Diagnostics, and launcher menu inspector.
- Top-level workspace rendering and lazy shell composition.

Delegated runtime ownership already extracted:

- Calculate, Calculus, Equation, Geometry, Guide, Launcher, Linear Algebra/Table shell, Statistics, Table, Trigonometry, side-surface layout, shell focus, Labs, and memory persistence now have app runtime hooks.
- Mode runners, worker clients, OOE traffic control, Equation/Algebra/Symbolic/Engine logic, and CSS selector homes are outside AppMain.

## Boundary Classification

Keep in AppMain or an AppMain-owned shell boundary:

- Final cross-mode mode switching.
- Commit/drop of visible `displayOutcome`.
- History finalization policy and replay fanout.
- Prompt auto-switch from runtime output into Equation.
- Guide example dispatch across multiple workspace owners.
- Global keyboard/keypad handling that spans launcher, side surfaces, Guide, and all workspaces.
- The outer JSX shell that wires ModeStrip, DisplayPanel, workspaces, KeypadPanel, and side surfaces.

Do not move into workspace runtime hooks:

- `commitOutcome` as a whole, because it combines Display, History, legacy Calculus canonicalization, variable substitutions, and multiple workspace replay payloads.
- `replayHistoryEntry` as a whole, because it fans out across Calculate, Calculus, Equation, Trig, Statistics, Geometry, Matrix, Vector, and Table.
- `launchGuideExample` as a whole, because Guide examples intentionally cross workspace ownership.
- Window/keypad/soft-action orchestration as a whole, because it depends on global surfaces, not one mode.

Ready for focused extraction:

- History and pending-ticket state can move behind an AppMain-owned history/display hook if it receives mode-specific context builders and replay delegates.
- Command routing can move behind an AppMain-owned command shell if it receives already-extracted routers and runtime hook outputs.
- Display model derivation can move behind an AppMain-owned display shell if it does not take ownership of `DisplayPanel` rendering policy.
- Workspace prop assembly can move into a shell component or view-model helper, but only if it preserves current lazy imports and ref ownership.

## High-Risk Contracts

- Preserve History entry shape, launch ordering, pending ticket stop semantics, typed replay seeds, legacy `advancedCalculus` replay compatibility, and variable substitution snapshots.
- Preserve OOE capability ids, worker host ids, fallback ids, stale/drop behavior, cancellation behavior, diagnostics wording, and runtime status labels.
- Preserve prompt auto-switch behavior for Equation and the current `settings.autoSwitchToEquation` contract.
- Preserve Guide example dispatch across Calculate, Equation, Calculus, Trigonometry, Statistics, Geometry, Table, launcher/history, clipboard, and mode switching.
- Preserve keyboard semantics: desktop-first layers, `Alt`/`AltGraph` as alpha, `Control` as command layer, momentary modifiers, lock behavior, Escape reset, and existing router tests.
- Preserve Display exact/approx copy behavior, To Editor canonical-LaTeX behavior, result badge labels, editor-analysis statuses, and large-input pause wording.
- Do not turn AppMain cleanup into an event bus, generic command framework, global reducer, Surface Protocol, Supercarrier implementation, or display/OOE ownership merge.

## Recommended Major Milestones

1. `APPMAIN-HISTORY-DISPLAY-SHELL1`
   - Completed on 2026-06-14.
   - Extracted an AppMain-owned hook for History state, pending ticket reservation/discard/finalization, pending-job Stop, History replay display reconstruction, `Ans`, and `commitOutcome`.
   - Kept mode-specific context builders and replay restoration delegates injected from AppMain/runtime hooks.

2. `APPMAIN-COMMAND-ROUTING-SHELL1`
   - Extract global command orchestration around primary action, soft actions, keypad routing, physical modifier layers, and window keydown/keyup dependencies.
   - Reuse the existing `primaryActionRouter`, `softActionRouter`, `keypadRouter`, and `windowKeyRouter`; do not invent a new command framework.
   - This should follow History/Display unless keyboard pressure becomes more urgent.

3. `APPMAIN-DISPLAY-MODEL-SHELL1`
   - Extract Display header/input derivation, result badge assembly, active algebra transform selection, editor runtime status label, keyboard layout construction, and DisplayPanel prop model assembly.
   - Do not move render scheduling, branch readback, notation policy, or solver output adaptation into AppMain.

4. `APP-SHELL-TRANSITIONAL-LOGIC-TIDY1`
   - Audit and remove or revive dormant app-logic scaffolds such as `appFlowHandlers.ts`, `modeActionHandlers.ts`, `modeGuideRouting.ts`, `focusRouting.ts`, and `solveSummary.ts`.
   - This should be a separate hygiene milestone because deletion needs import-search proof and may lower file-size baselines.

5. `DISPLAY-PANEL-SURFACE-AUDIT0`
   - Audit `src/app/shell/DisplayPanel.tsx` before splitting it. At 1590 lines, it is now a larger pressure point than several runtime hooks.
   - Keep this separate from AppMain so display rendering policy does not get mixed into orchestration cleanup.

## Stop Rules

- Stop if a proposed AppMain split requires changing solver behavior, output wording, Display readback policy, OOE policy, capability ids, worker-host behavior, replay/history contracts, stored-value behavior, named-variable behavior, or reserved-symbol behavior.
- Stop if `commitOutcome`, replay restoration, or Guide dispatch cannot be moved without broad dependency injection that is harder to reason about than the current code.
- Stop if a cleanup tries to delete root facades or OOE direct district imports as a side effect.
- Stop if dormant app-logic deletion reveals any dynamic import, test-only import, or planned compatibility consumer not visible in the static search.

## Test Gates For Future Splits

- AppMain UI replay and History coverage: `npm run test:ui -- src/AppMain.ui.test.tsx`.
- Status/runtime UI coverage: `npm run test:ui -- src/AppMain.status.ui.test.tsx`.
- Runtime hook focused suites for touched modes.
- Router unit suites for command work: `primaryActionRouter`, `softActionRouter`, `keypadRouter`, and `windowKeyRouter`.
- OOE and History adjacency: `runtimeControllers`, `editorRuntimeControl`, OOE runtime-control/job-launch tests, and relevant mode worker tests.
- Full gates for high-risk AppMain slices: TypeScript, lint, build, file-size ratchet, memory protocol, and `git diff --check`.

## Final Split Record: APPMAIN-HISTORY-DISPLAY-SHELL1

`APPMAIN-HISTORY-DISPLAY-SHELL1` moved the History/Display shell into `useHistoryDisplayRuntime` without changing solver behavior, Display readback wording, OOE traffic-control semantics, or History schema.

The hook now owns:

- History entries, pending History tickets, History launch ordering, `displayOutcome`, and `ansLatex`.
- Ticket reservation, discard, stopping status, finalized append, reset/delete History actions, pending-job Stop request dispatch, and persistence calls.
- `commitOutcome` display/history coupling, including prompt auto-switch to Equation, suppressed visible commits, history-disabled discards, and canonical HistoryEntry construction through a private pure helper.
- Replay display restoration plus replay-substitution setup, with all mode-specific restore operations injected as delegates.
- Calculator-memory history/display fragment restore and loaded-history launch-order synchronization.

`AppMain` still owns:

- Top-level mode switching, settings, variable memory, launcher state, Guide dispatch, command routing, side-surface rendering, DisplayPanel prop assembly, and mode runtime construction.
- Mode-specific history context builders and replay restoration delegates.
- Whole-app calculator-memory orchestration through `useCalculatorMemoryPersistence`.

Verification added `src/app/runtime/useHistoryDisplayRuntime.ui.test.tsx` for ticket lifecycle, commit behavior, prompt auto-switch, disabled history, replay restoration, legacy Calculate-to-Calculus replay, Stop requests, and memory restore behavior. The file-size baseline was lowered for `src/AppMain.tsx` from 4213 to 3357 lines.

## Recommended Next Move

Proceed with `APPMAIN-COMMAND-ROUTING-SHELL1` if the next goal is continued AppMain slimming around primary action, soft action, keypad, and window-key orchestration. Keep `APPMAIN-DISPLAY-MODEL-SHELL1`, `APP-SHELL-TRANSITIONAL-LOGIC-TIDY1`, and `DISPLAY-PANEL-SURFACE-AUDIT0` as separate follow-ups so command routing, display model derivation, dormant app-logic cleanup, and DisplayPanel rendering policy do not blur together.
