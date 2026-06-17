# Workspace Tabs Roadmap

date: 2026-06-17  
primary_agent: codex  
primary_agent_model: gpt-5.5  
status: planning roadmap

## Purpose

This roadmap turns `WORKSPACE-TABS-SURFACE-AUDIT0` into a safe implementation sequence for browser-style workspace tabs.

Tabs are session-scoped workspace instances inside one app shell. They are not saved projects, not user files, not multiple `AppMain` copies, not a second OOE authority, not a broad bus, not Surface Protocol, and not a runtime registry.

The user-facing goal is simple: a student can keep Calculate, Equation, Calculus, Table, or another workspace open at the same time, switch without losing context, and run/stop work per tab. The architectural goal is stricter: each tab gets a stable `workspaceInstanceId`, OOE jobs are scoped to that instance, and inactive workspace state is preserved without mounting hidden full React trees by default.

## Current Baseline

Current app shape:

- `AppMain` owns a singleton `currentMode`.
- App runtime hooks own mode-specific singleton state.
- Display and History are global shells.
- OOE owns launch, host selection, cancellation, stale gates, commit legality, diagnostics, lifecycle events, and runtime evidence.
- Supercarrier owns compartment boundaries and diagnostics labels, not tab behavior.

Existing audit:

- `docs/architecture/supercarrier/workspace-tabs-surface-audit.md`

That audit is authoritative for stop rules and terminology unless a later roadmap update explicitly changes it.

## Non-Goals

The first tabs lane must not introduce:

- projects, `My Work`, saved tab files, document tabs, or multi-window behavior;
- Spreadsheet or Graphing persistence;
- Graphing as a compartment, route, workspace, pack, or Surface candidate;
- a broad bus, command authority, runtime registry, plugin layer, SDK, generated source, or Surface Protocol;
- permanent History identity based on mutable tab titles;
- multiple `AppMain` trees or hidden mounted full workspace trees for every inactive tab.

Spreadsheet and Graphing may need saved-work/file-like models later, but that is a separate product/storage design problem. Tabs V1 should stay session-scoped.

## Locked Product Decisions

- `+` creates a blank Calculate tab for V1.
- A later settings option may allow a default new-tab workspace kind, but settings is not a prerequisite.
- Left-clicking a mode launcher should focus the most recent tab of that workspace kind or create one if none exists.
- Right-clicking a mode launcher may expose workspace commands:
  - `Open`
  - `Open in New Tab`
  - `Open Blank Tab`
  - `Open from Current Input`
  - `Set as New Tab Default`
- Right-clicking a tab may expose:
  - `Rename`
  - `Duplicate`
  - `Close`
  - `Close Others`
  - `Stop Jobs in This Tab`
  - `Clear Tab State`
- Tab titles are mutable human labels. They are never commit legality, stale-gate identity, or permanent History truth.
- Committed History remains global and workspace-based.
- Pending/running UI may show tab names temporarily to disambiguate simultaneous jobs.
- Closing a tab with active jobs must cancel or stale-drop those jobs before removing the instance.
- Closing a tab never deletes global committed History.

## Target Shape

```text
AppMain
  -> App shell controls
  -> WorkspaceTabsShell
     -> WorkspaceInstanceController
        -> active WorkspaceSurfaceHost
           -> Calculate | Equation | Calculus | Table | ...
  -> global Display/History/Diagnostics shells
  -> one OOE authority
```

Core identity:

```ts
type WorkspaceInstance = {
  id: WorkspaceInstanceId;
  workspaceKind: WorkspaceKind;
  title: string;
  compartmentId: CompartmentId;
  surfaceState: unknown;
  displayState: unknown;
  runtimeState: unknown;
};
```

The exact TypeScript shape can differ during implementation, but the identity rules cannot: `workspaceInstanceId` is stable; `title` is mutable display text.

## Roadmap Sequence

### 1. `WORKSPACE-INSTANCE-MODEL1`

Goal: add the internal workspace-instance model without visible browser tabs.

Expected scope:

- Add typed `WorkspaceInstanceId`, `WorkspaceKind`, and workspace-instance controller state under app runtime or app shell runtime.
- Represent the current singleton mode as one active workspace instance.
- Add title, workspace kind, compartment id, active instance id, and close/duplicate/rename policy functions.
- Define last-tab behavior: closing the final tab creates/focuses blank Calculate.
- Keep Display/History global and unchanged.
- Keep OOE job identity unchanged in this milestone.

Acceptance:

- Current app behavior remains visually unchanged.
- Existing mode switching still works.
- Tests prove tab identity/title operations without rendering multiple workspace trees.

Stop if this requires multiple `AppMain` instances, project/file semantics, History schema changes, or OOE job changes.

Implementation record, 2026-06-17:

- Added a pure app-runtime workspace-instance model and a `useWorkspaceInstancesRuntime` hook.
- Kept `currentMode` as the live behavior source while the hook shadows mode changes into one active session instance list.
- Added deterministic model and hook tests for create/focus/latest-kind/create, rename, duplicate, close/final-tab fallback, close-others, and state placeholder clearing.
- Did not add visible tabs, OOE `workspaceInstanceId`, History schema changes, persistence changes, projects/files, Graphing, Spreadsheet, bus work, Surface Protocol, or multiple mounted workspace trees.

### 2. `WORKSPACE-STATE-HOST1`

Goal: prepare active-only workspace rendering and state preservation.

Expected scope:

- Introduce a workspace surface host that can activate one workspace instance at a time.
- Define how per-instance surface state is captured/restored for the first core mode families.
- Keep inactive workspace instances stored as plain state, not hidden mounted full React trees by default.
- Start with the chosen Core First coverage: Calculate, Equation, and Calculus.
- Leave Trigonometry, Statistics, Geometry, Table, Matrix/Vector, Guide, Spreadsheet, and Graphing out of this first hosting milestone.

Acceptance:

- Switching between workspace instances preserves draft/menu/workbench state for covered workspaces.
- No duplicate global keyboard, MathLive, OOE, history, or persistence listeners are introduced.
- AppMain remains one shell.

Stop if preserving state requires mounting all inactive workspaces.

Implementation record, 2026-06-17:

- Added `useWorkspaceStateHostRuntime` as an active-only host that captures outgoing workspace surface state, focuses or creates the next workspace instance, and restores incoming saved surface state into the active singleton runtime hook.
- Extended the workspace-instance model and hook with `updateInstanceSurfaceState`.
- Added capture/restore adapters for Calculate, Equation, and Calculus.
- Hosted only surface state: Calculate editor/menu/algebra tray and compact calculus quickforms, Equation editor/menu/solve target/numeric panel/polynomial/system state, and guided Calculus menu/workbench state.
- Kept Display, committed History, diagnostics, persistence, OOE job identity, stale gates, cancellation, and commit legality global and unchanged.
- Did not add visible tabs, OOE `workspaceInstanceId`, projects/files, Graphing, Spreadsheet, bus work, Surface Protocol, or multiple mounted workspace trees.

Expansion record, 2026-06-17:

- Renamed the private core state-host wrapper into the general `workspace-surface-state` / `useWorkspaceSurfaceStateHostRuntime` layer.
- Added surface-state snapshot types and capture/restore adapters for Trigonometry, Statistics, Geometry, Table, Matrix, and Vector.
- Extended AppMain's invisible state host so Calculate, Equation, Calculus, Table, Trigonometry, Statistics, Geometry, Matrix, and Vector all preserve active surface state across workspace-instance switches.
- Kept global Display, committed History, persistence, OOE behavior, visible tabs, Guide, Labs, projects/files, Graphing, Spreadsheet, bus work, Surface Protocol, and multiple mounted workspace trees out of scope.

### 3. `OOE-WORKSPACE-INSTANCE-SCOPE1`

Goal: make OOE safe for simultaneous tabs of the same workspace kind.

Expected scope:

- Add `workspaceInstanceId` to active job identity, pending tickets, request revision snapshots, runtime envelopes where needed, diagnostics records, OOE events, and recent-job inspection.
- Make stale-drop and commit legality instance-aware.
- Make cancellation instance-aware.
- Ensure a job from a closed tab cannot commit later even if another tab of the same workspace kind remains open.
- Preserve OOE as the only authority for cancellation, stale drops, commit legality, host selection, and diagnostics.

Acceptance:

- Two Equation tabs can launch independent jobs without cross-committing.
- Closing one active tab cancels/stale-drops its work without affecting the other tab.
- Diagnostics can show workspace instance labels for pending/running evidence.
- Committed History remains workspace-based, not title-based.

Stop if tabs start deciding commit legality outside OOE.

Implementation record, 2026-06-17:

- Added shared `WorkspaceInstanceId` and `WorkspaceInstanceRuntimeContext` types under `src/types/calculator/` and re-exported them from the app-runtime workspace-instance model.
- Extended OOE job identity, commit assessment, launch-ticket evidence, active/recent job records, diagnostics records, event envelopes, runtime shell evidence, and diagnostics inspector rows with optional workspace-instance metadata.
- Threaded active workspace-instance context from AppMain through `useHistoryDisplayRuntime` reservations into Calculate, Equation, Calculus, Table, Trigonometry, Statistics, Geometry, Matrix, and Vector OOE-backed launch paths.
- Made OOE commit legality instance-aware: jobs without instance metadata keep current behavior; jobs with closed/missing instances stale-drop; open instances still use the existing input-revision stale/drop logic.
- Kept committed History workspace-based and global. Launch-time tab labels are diagnostic/pending metadata only, not historical identity.
- Did not add visible tabs, per-instance Display, per-instance History, persistence/schema changes, projects/files, Graphing, Spreadsheet, broad bus work, Surface Protocol, or multiple mounted workspace trees.

### 4. `WORKSPACE-TABS-SHELL1`

Goal: add the visible browser-style tabs.

Expected scope:

- Add the tab strip and `+` button.
- Default `+` to a blank Calculate tab.
- Add tab selection, rename, duplicate, close, close others, stop jobs in tab, and clear tab state.
- Keep active rendering to one workspace surface.
- Keep global shell controls, settings, variable memory, History, diagnostics, and OOE authority shared.

Acceptance:

- Users can keep multiple workspaces open and switch without losing local session state.
- Closing active jobs asks for cancel/keep-open or uses the planned close policy.
- Last-tab close returns to blank Calculate.
- No project/file or saved-work UI appears.

### 5. `WORKSPACE-MODE-LAUNCHER-TABS1`

Goal: wire mode launcher context actions to the tab model.

Expected scope:

- Left-click mode behavior: focus latest existing tab of that kind or create one.
- Right-click mode context menu:
  - `Open`
  - `Open in New Tab`
  - `Open Blank Tab`
  - `Open from Current Input`
  - `Set as New Tab Default`
- Implement `Open from Current Input` only for workspaces with safe existing handoff semantics.
- Defer unsupported handoffs rather than guessing.

Acceptance:

- Mode launchers become tab-aware without destroying the active workspace.
- Existing send-to-Equation/Calculate flows keep their old behavior unless explicitly mapped.

### 6. `WORKSPACE-TABS-HISTORY-PENDING-LABELS1`

Goal: make pending/running work understandable without changing committed History truth.

Expected scope:

- Pending tickets and running surfaces may show current tab title plus workspace kind.
- Committed History entries keep workspace/capability identity.
- If a tab is renamed while a job is running, pending UI may update or snapshot the current label, but commit legality uses `workspaceInstanceId` and History records workspace identity.

Acceptance:

- Multiple simultaneous jobs are visually distinguishable.
- Closing/reopening the app does not rely on tab titles to explain old committed History.

## Deferred Follow-Ups

These are intentionally out of V1:

- persisted tab sessions across app restarts;
- per-tab draft warning policy beyond active-job close safety;
- default new-tab workspace setting;
- project/work file model;
- Spreadsheet saved-work model;
- Graphing scene/runtime workspace;
- broad internal bus;
- Surface Protocol;
- external workspace embedding.

## Test Strategy

Every implementation milestone should include:

- focused app-runtime/app-shell tests for instance state;
- OOE tests for instance-scoped stale/drop/cancel/commit behavior once OOE scope begins;
- AppMain UI tests for visible tab workflows once the shell exists;
- History tests proving committed records stay workspace-based;
- diagnostics tests proving pending/running labels are disambiguating but not authoritative;
- `npm run test:compartments-boundaries`;
- `npm run test:memory-protocol`;
- `npm run lint`;
- `npm run build` for UI/runtime milestones.

## Stop Rules

Stop and re-plan if a milestone requires:

- permanent History identity tied to tab titles;
- a saved-work/project/file model;
- Graphing or Spreadsheet as a prerequisite;
- multiple full `AppMain` trees;
- hidden mounted full workspace trees for every inactive tab;
- a new OOE authority or tab-side commit legality;
- broad bus, command framework, Surface Protocol, plugin, SDK, runtime registry, or generated contract work.

## Definition Of V1 Done

Workspace tabs V1 is done when:

- one app shell can host multiple session workspace instances;
- only the active workspace renders by default;
- tab switching preserves local workspace state;
- OOE jobs are scoped by `workspaceInstanceId`;
- closing active tabs cannot allow late commits;
- committed History remains global and workspace-based;
- pending/running UI can disambiguate by tab label;
- no project/file model has been introduced.
