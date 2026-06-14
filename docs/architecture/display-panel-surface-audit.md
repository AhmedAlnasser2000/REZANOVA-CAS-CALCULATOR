# DisplayPanel Surface Audit

Status: audit-only baseline for `src/app/shell/DisplayPanel.tsx`.

Purpose: map the app-shell DisplayPanel component before any component split. DisplayPanel is the visible composition surface for the top display editor, preview, result readback, transform actions, Guide/Labs/menu previews, and scheduled result block mounting. It is not the `src/lib/display` policy layer and should not absorb solver, OOE, history, or workspace runtime ownership.

## Current Shape

- `src/app/shell/DisplayPanel.tsx`: 1590 lines.
- Local render helpers: detail-line mixed content, large-result preview, Latex block/list rendering, branch-list rendering, text/mixed block rendering, scheduled display block wrappers, collapsible summary blocks, and placeholder blocks.
- Main component responsibilities: mode/editor surface selection, menu/route display cards, Labs preview, launcher/Guide previews, expression preview, resolved-form display, transform tray, result actions, and scheduled outcome rendering.
- Data source: AppMain passes a wide prop object after assembling mode-specific runtime state, Display result badges, active expression callbacks, copy/editor actions, and workspace route metadata.

## Responsibility Map

- Render primitives: `DetailLineContent`, `LargeResultPreview`, `ResultLatexBlock`, `ResultLatexListBlock`, `ResultBranchListBlock`, `RenderDisplayBlock`, `ResultSummaryBlock`.
- Result scheduling integration: display block signature, visible block set, queued block reveal timer, placeholders, and `Rendering result` status.
- Header and editor shell: status label, editor runtime controls, Labs preview header, route metadata panels, MathEditor instances, and standby MathStatic.
- Preview shell: launcher, mode menus, Guide search/article preview, Labs runner preview, and expression preview actions.
- Result shell: title/badges, menu/help copy, resolved form, transform summary, algebra transform tray, solve/numeric notes, action buttons, success/error/prompt rendering.

## Future Split Candidates

- `DisplayResultBlocks.tsx`: Latex block/list, branch rows, mixed/text block rendering, large-result preview, and collapsible summary block primitives.
- `DisplayRenderQueue.tsx` or hook: scheduled visibility state, reveal timer, queued-block status, and placeholder rendering.
- `DisplayEditorSurface.tsx`: mode-specific editor/route/standby rendering for Calculate, Equation, Calculus, Trig, Statistics, Geometry, Matrix/Vector/Table, Guide, Labs, and Launcher.
- `DisplayPreviewSurface.tsx`: launcher/menu/Guide/Labs/expression preview cards.
- `DisplayOutcomeActions.tsx`: Copy Result, Run Numeric, To Editor, send/load actions, algebra transform tray, and result action dispatch wiring.
- `useDisplayPanelModel.ts`: optional AppMain-adjacent model builder only if prop pressure stays high after subcomponent extraction.

## High-Risk Contracts

- Copy Result and To Editor must keep canonical exact Latex and not visible compacted Latex.
- Large-result preview and Show full result stay display-only.
- Branch rows keep current visible limit and explicit Show remaining branches action.
- Scheduled block reveal must not change OOE commit/drop semantics or history persistence.
- Guide, Labs, launcher, menu, and mode route previews must keep current screen/routing behavior.
- Algebra transform tray actions must stay mode-owned through injected callbacks.

## Test Gates

- AppMain UI/status smoke for full display shell behavior.
- Focused DisplayPanel UI tests should be added before a component split if a stable harness is not already sufficient.
- Result helper tests under `src/lib/display/result/` and `src/lib/display/scheduling/` should run whenever block rendering or scheduler integration changes.
- Runtime controller and AppMain history/display hook tests should run if copy/history/replay or prompt actions are touched.

## Stop Rules

- Do not change solver behavior, exact Latex, output wording, branch row policy, Show-full-result behavior, copy/to-editor behavior, history/replay semantics, OOE policy, schemas, capability ids, worker-host behavior, stored-value behavior, mode routing, Guide behavior, Labs gating, or reserved-symbol behavior during DisplayPanel cleanup.
- Do not move `src/lib/display` policy helpers into app-shell component modules.
- Do not introduce a generic UI framework, event bus, global reducer, or display protocol while splitting this component.

## Final Split Record: DISPLAY-PANEL-RESULT-SHELL1

`DISPLAY-PANEL-RESULT-SHELL1` moved DisplayPanel's committed-result rendering primitives and scheduled reveal state into private app-shell modules.

- Added `src/app/shell/display-panel/DisplayResultBlocks.tsx` for detail-line mixed rendering, large-result previews, Latex/list/branch result blocks, collapsible summary blocks, placeholders, and scheduled outcome block grouping.
- Added `src/app/shell/display-panel/useDisplayRenderQueue.ts` for DisplayOutcome block construction, render-order scheduling, visible block tracking, and queued-render status.
- Added `src/app/shell/DisplayPanel.ui.test.tsx` for focused DisplayPanel result-shell coverage and moved direct result-rendering cases out of the broad AppMain UI suite.
- Kept `src/app/shell/DisplayPanel.tsx` as the stable exported component and preserved all user-facing result rendering contracts, class names, test ids, copy/to-editor behavior, and scheduling behavior.
