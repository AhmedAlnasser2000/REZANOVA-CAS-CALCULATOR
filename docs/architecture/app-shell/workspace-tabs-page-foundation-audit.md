# Workspace Tabs Page Foundation Audit

Status: `WORKSPACE-TABS-PAGE-FOUNDATION-AUDIT0` docs/memory-only readiness audit

Purpose: check whether the current workspace-tab foundation is ready for future dedicated full-page surfaces without building those pages now. This audit covers full History/Records, full Settings, richer Variables management, possible Guide pages, and later Graphing or Spreadsheet surfaces. It does not implement UI, add routes, change runtime behavior, change History schema, add saved projects/files, or introduce Graphing/Spreadsheet.

## Current Baseline

Workspace tabs V1 is functionally complete for session-scoped compute workspaces:

- one `AppMain` shell;
- one active rendered workspace surface;
- one OOE authority;
- stable `workspaceInstanceId`;
- browser-style same-tab launcher retargeting;
- explicit `Open in new tab` launcher actions;
- `+` creates a blank Calculate tab;
- per-instance surface, Display/Ans, and runtime status state for current runtime workspaces;
- OOE job scoping, stale-drop, close, and Stop behavior by workspace instance;
- global committed History and global settings.

Tabs also now have an agreed product role beyond multiple calculator workspaces: they are the future full-surface layer for richer pages. Side panels remain quick-access companions for recent History, common Settings toggles, Vars, and diagnostics.

## Readiness Finding

The foundation is ready enough to move on from tabs V1. Future full pages should build on this tab shell instead of creating a second route system, second `AppMain`, or separate page-window model.

The foundation is not yet a direct page-tab implementation surface. The current code intentionally models tab content as calculator `ModeId` workspaces:

- `WorkspaceKind = ModeId`;
- `WorkspaceInstance.workspaceKind` resolves a calculator compartment;
- `useWorkspaceSurfaceStateHostRuntime` registers concrete math workspace capture/restore adapters;
- focusing a tab calls `commitVisibleModeSelection(target.workspaceKind)`;
- tab actions include compute-oriented affordances such as `Stop Jobs in This Tab`.

That is correct for tabs V1. Future page tabs should add a thin page-surface layer before the first dedicated page is built, rather than adding pseudo modes such as `history-page` or `settings-page` to calculator `ModeId`.

## Ready Contracts

The current foundation can already support these future page needs:

- Stable tab identity, label, focus, close, rename, duplicate, and close-others mechanics.
- Active-only rendering, so future pages do not require hidden mounted React trees.
- A single app shell that can host either a runtime workspace surface or, later, a management page surface.
- Global state ownership for History, Settings, Variables, diagnostics, and OOE remains in AppMain/app-runtime seams.
- Per-tab saved state slots can store lightweight UI state such as filters, selected rows, search text, category, scroll position, or selected settings section.
- Close of non-compute pages does not need OOE job cancellation, while compute tabs keep the existing OOE cancellation/stale-drop path.
- Mutable tab titles remain human labels only; they are not commit legality, schema identity, or artifact truth.

## Required Before First Page Implementation

Before building a full History, Settings, Variables, Guide, Graphing, or Spreadsheet page, add a small foundation milestone that separates "what a tab hosts" from "what calculator mode is active".

Recommended shape:

```ts
type WorkspaceTabSurface =
  | { kind: 'runtime-workspace'; workspaceKind: ModeId }
  | { kind: 'management-page'; pageKind: WorkspacePageKind };

type WorkspacePageKind =
  | 'history-records'
  | 'settings'
  | 'variables'
  | 'guide';
```

The exact names can differ, but the separation matters. Future page tabs should not expand `ModeId`, launcher leaves, OOE workspace kinds, or calculator runtime hosts unless the surface is actually a runtime workspace.

The page foundation should also define:

- per-surface tab menu policy: which surfaces allow Duplicate, Clear State, Stop Jobs, Close Others, and Rename;
- page state capture/restore slots independent from math workspace adapters;
- how focusing a management page preserves or suspends the last runtime `currentMode`;
- how top-header mode controls behave while a management page is active;
- whether `+` remains Calculate-only until `WORKSPACE-TABS-DEFAULTS1`;
- page creation commands, likely from side-panel escalation or explicit app actions, not from normal launcher retargeting;
- accessibility labels that distinguish runtime workspace tabs from management page tabs.

## Surface-Specific Readiness

### Full Settings

Most ready as a first page candidate. Settings are already global, persisted, and controlled through AppMain/app-runtime callbacks. A full Settings page can reuse the same state and callbacks while keeping the quick Settings side panel for common toggles.

Needed before implementation:

- page-kind tab surface model;
- Settings page layout and category state;
- action policy where Stop Jobs is hidden and Clear State clears only page UI state, not settings values.

### Full History/Records

Ready for a browsing/search/filter page over existing committed computation History, but not for new artifact families.

Allowed:

- richer filtering, search, grouping, copy/replay controls, pending/running visibility, and record detail.

Not allowed in the first page:

- mutable tab titles as historical identity;
- per-tab committed History;
- Graphing/Spreadsheet saved artifacts forced into current `HistoryEntry`;
- project/file semantics.

### Variables Manager

Ready after the same page-surface model. The current Variables panel already owns CRUD-style callbacks over global variable memory, and a fuller page can add categories, search, richer validation, and bulk actions without changing stored-variable parsing.

Do not widen named-variable syntax, stored-value parsing, reserved-symbol policy, or variable-memory persistence as part of the page foundation.

### Guide Pages

Possible, but less urgent. Guide is already a full workspace-like surface in the current app and is not a launcher new-tab leaf. A future Guide page should be planned deliberately around route/search/article state and example launch behavior.

### Graphing And Spreadsheet

Not ready for implementation from this audit. The tab foundation is useful for their future full surfaces, but both likely need their own artifact/work model before saved work, history, or persistence can be designed.

Do not force Graphing or Spreadsheet into:

- current computation `HistoryEntry`;
- current Display/Ans slots;
- a calculator `ModeId` if the product model is a scene/grid artifact rather than a one-shot compute workspace;
- projects/files before a separate storage audit exists.

## Stop Rules

Stop and re-plan if a future page milestone requires:

- adding fake calculator modes for management pages;
- second `AppMain` trees or hidden mounted full page trees for all inactive tabs;
- a second OOE authority or tab-side commit legality;
- replacing quick side panels instead of complementing them;
- changing committed History schema to make full History usable;
- forcing Graphing or Spreadsheet artifacts into current computation History;
- persisted projects/files or saved tab documents;
- broad bus, Surface Protocol, plugin/runtime registry, or generated contract work.

## Recommended Next Milestones

1. `WORKSPACE-TABS-PAGE-SURFACE-MODEL1`
   - Add only the typed tab-surface/page-kind distinction and per-surface action policy.
   - Preserve current runtime workspace behavior exactly.
   - Do not add a visible page yet.

2. `WORKSPACE-FULL-SETTINGS-PAGE1` or `WORKSPACE-HISTORY-RECORDS-PAGE0`
   - Settings is the safer first implementation candidate.
   - History should start with a page-specific audit if it will introduce richer record concepts beyond current committed computation History.

3. Graphing/Spreadsheet readiness audits later
   - Start with artifact, storage, replay, and solver-output contracts.
   - Do not treat the tab foundation as sufficient by itself.

## Verification

Docs-only audit gate:

- `npm run test:memory-protocol`
- `git diff --check`
