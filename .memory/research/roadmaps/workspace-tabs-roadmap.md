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
- Display outcome, `Ans`, and replay display/substitution fragments are workspace-instance session state.
- Committed History remains a global shell.
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
- Normal left-click mode selection retargets the active tab, like entering a new site in the same browser tab.
- Opening or focusing a separate workspace tab must be an explicit tab action such as tab click, `+`, duplicate, or a later mode-launcher context command.
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
- Tabs do not replace quick side panels. Side panels remain for fast, essential, while-working access such as recent History, common Settings toggles, Vars, and developer diagnostics.
- Dedicated tab pages are for fuller management surfaces that need room: full History/Records, full Settings, richer Variables management, future Graphing, future Spreadsheet, and any future surface that cannot fit the MathEditor/right-inspector shape.
- The side-panel/full-page split is intentional: quick panels should stay small and efficient, while full tab pages can handle search, organization, filtering, larger records, richer configuration, and future artifact types that do not belong in the current computation `HistoryEntry` schema.

## Target Shape

```text
AppMain
  -> App shell controls
  -> WorkspaceTabsShell
     -> WorkspaceInstanceController
        -> active WorkspaceSurfaceHost
           -> Calculate | Equation | Calculus | Table | ...
  -> per-instance Display/Ans state
  -> global History/Diagnostics shells
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

Implementation record, 2026-06-17:

- Added the first visible browser-style workspace tab strip above the mode strip through the private app-shell `WorkspaceTabs` component.
- Kept the app on one `AppMain`, one active rendered workspace surface, one OOE authority, global Display, and global committed History.
- Added tab actions for focus, plus-created blank Calculate tabs, rename, duplicate, close, close others, clear tab state, and stop jobs in a tab.
- Kept mode-launcher right-click tab commands deferred to `WORKSPACE-MODE-LAUNCHER-TABS1`.
- Added app-runtime tab job helpers so shell code can summarize/cancel active OOE jobs by `workspaceInstanceId` without importing OOE internals directly.
- Extended pending tickets with optional temporary `workspaceInstanceId` / `workspaceInstanceLabel` metadata for UI disambiguation only. Final committed `HistoryEntry` records remain unchanged and workspace-based.
- Closing a tab with active or pending work now asks for `Cancel jobs and close` or `Keep open`; confirmed close cancels matching active jobs, discards matching pending tickets, closes the instance, and relies on existing OOE instance stale-drop for late results.
- Added shell CSS for tab sizing, truncation, active/busy states, compact tab menus, inline rename, and close confirmation without broader visual redesign.
- Added focused `WorkspaceTabs` UI coverage plus runtime/pending-ticket coverage.
- Did not add per-instance Display, per-instance committed History, persisted tab sessions, projects/files, Graphing, Spreadsheet, broad bus work, Surface Protocol, mode-launcher context menus, default-new-tab settings, or multiple mounted workspace trees.

### 5. `WORKSPACE-DISPLAY-STATE-HOST1`

Goal: keep visible results, `Ans`, and replay display fragments scoped to their origin workspace tab.

Expected scope:

- Store `displayOutcome`, `ansLatex`, and replay display/substitution fragments in each `WorkspaceInstance.displayState`.
- Capture outgoing display state before tab/mode focus changes and restore the incoming instance's saved display state.
- Make `commitOutcome` origin-aware through existing launch-ticket workspace-instance context.
- If a result belongs to an inactive but still-open instance, update that instance's saved display state without switching tabs or changing the active display.
- If a result belongs to the active instance, update visible display as today and mirror it into the active instance state.
- Keep committed History global and schema-stable.
- Replay History into the matching workspace tab only.

Acceptance:

- Calculate results do not appear in Equation tabs.
- Equation facts, assumptions, valid-when sections, and answers do not appear in Calculate tabs.
- Inactive tab completion updates only the origin tab's saved display state.
- Switching back restores each tab's own result and `Ans`.

Implementation record, 2026-06-17:

- Added `workspace-display-state.ts` and `useWorkspaceDisplayStateHostRuntime`.
- Extended the workspace-instance model and runtime hook with display-state updates and duplicate-state copying.
- Extended `useHistoryDisplayRuntime` with display-state capture/restore and origin-aware commit behavior.
- Wired AppMain tab switching, tab duplication, tab close, and clear-tab-state through the display-state host.
- Added regression coverage proving Calculate and Equation tab results stay isolated at the visible AppMain layer.
- Follow-up fix in `WORKSPACE-INACTIVE-TAB-COMMIT-FIX1`: removed the passive active-display mirror so display state changes only through explicit capture or origin commit.
- Kept committed History global and workspace-based; no History schema, project/file, saved-tab-session, Graphing, Spreadsheet, broad bus, Surface Protocol, or runtime registry work.

### 6. `WORKSPACE-TABS-HISTORY-PENDING-LABELS1`

Goal: make pending/running work understandable without changing committed History truth.

Expected scope:

- Pending tickets and running surfaces show the launch-time tab title plus workspace kind when available.
- Committed History entries keep workspace/capability identity.
- If a tab is renamed while a job is running, pending UI keeps the launch-time label.
- Commit legality uses `workspaceInstanceId`; committed History records workspace identity.

Acceptance:

- Multiple simultaneous jobs are visually distinguishable.
- Closing/reopening the app does not rely on tab titles to explain old committed History.

Implementation record, 2026-06-17:

- Added launch-time tab labels to pending/running/stopping History rows when `workspaceInstanceLabel` is present.
- Kept finalized History rows unchanged: no tab title, `workspaceInstanceId`, or mutable workspace label is stored or rendered after commit.
- Preserved launch-time label semantics: if a tab is renamed while a job is running, the pending ticket continues showing the original launch label.
- Kept close/cancel behavior aligned with the existing tab shell: confirmed close cancels matching active work and clears matching pending tickets before OOE stale-drop protects late results.

### 7. `WORKSPACE-MODE-LAUNCHER-TABS1`

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

Implementation note, 2026-06-18:

- Superseded by the landed `WORKSPACE-TABS-LAUNCHER-ACTIONS1` name.
- The implemented scope is explicit new-tab launcher actions, not the full defaults/settings lane.

### 7A. `WORKSPACE-ACTIVE-TAB-MODE-SWITCH1`

Goal: fix normal navigation semantics after the first visible tab shell.

Implementation record, 2026-06-17:

- Changed normal mode selection to retarget the active workspace instance instead of focusing/creating a same-kind tab.
- Preserved explicit tab actions as the only current way to create or focus separate instances: tab click, `+`, duplicate, close, and close others.
- Added `titleSource` tracking so default tab titles update to the new mode on retarget while user-renamed/custom titles survive.
- Added `navigationRevision` to workspace instances and launch-time OOE workspace-instance context.
- Made OOE commit legality revision-aware so a job launched before same-tab navigation stale-drops if it returns after the tab has been retargeted.
- Kept committed History global and schema-stable; History replay loads into the active tab through the same retarget path.
- Kept mode-launcher right-click tab commands, default-new-tab settings, projects/files, Graphing, Spreadsheet, broad bus, Surface Protocol, runtime registry, plugin layer, and multi-window behavior out of scope.

### 7B. `WORKSPACE-RUNTIME-STATUS-HOST1`

Goal: make editor/runtime status active-tab scoped after visible tabs.

Implementation record, 2026-06-17:

- Added a workspace runtime-state host for DisplayPanel-facing transient runtime state.
- Added `WorkspaceRuntimeState` with clipboard notice, editor stopped state, editor restart generation, and runtime status override fields.
- Extended the workspace-instance model and hook with runtime-state updates and duplicate-state copying.
- Wired tab focus, tab creation, duplicate, close, close-others, clear-tab-state, and same-tab retarget through runtime-state capture/restore.
- Scoped pending OOE status labels to the active `workspaceInstanceId`, while preserving legacy behavior for jobs without instance metadata.
- Removed the app-wide React transition pending flag from DisplayPanel status, so a background tab job no longer makes the active tab show `Computing`.
- Kept OOE authority unchanged: OOE still owns launch, cancellation, stale-drop, commit legality, diagnostics, and lifecycle evidence.
- Kept committed History global and schema-stable; no mode-launcher context menu, default-new-tab settings, projects/files, Graphing, Spreadsheet, bus, Surface Protocol, runtime registry, plugin layer, or multi-window behavior.

### 7C. `WORKSPACE-TABS-JOB-LIFECYCLE-FIX1`

Goal: repair the first visible-tabs job lifecycle regression without changing the broader tabs model.

Implementation record, 2026-06-18:

- Removed real job cancellation from same-tab mode retarget. Same-tab navigation now invalidates older work by `navigationRevision` only.
- Kept OOE commit legality as the authority: jobs launched under an older workspace-instance revision stale-drop if they return after the tab has been retargeted.
- Added revision-aware active-tab status and tab job summaries so obsolete old-revision pending/running work does not make the retargeted tab look busy.
- Preserved tab switching semantics: focusing another tab does not cancel the origin tab's running jobs, and jobs from still-open origin tabs remain eligible to commit into that tab's saved Display/Ans state.
- Preserved explicit cancellation paths: closing a tab and `Stop Jobs in This Tab` still request cancellation for matching active work.
- Kept committed History global and schema-stable; no mode-launcher context menu, default-new-tab settings, projects/files, Graphing, Spreadsheet, bus, Surface Protocol, runtime registry, plugin layer, or multi-window behavior.

### 7D. `WORKSPACE-INACTIVE-TAB-COMMIT-FIX1`

Goal: finish the inactive-tab completion path by making OOE active-input revision checks origin-instance aware.

Implementation record, 2026-06-18:

- Added a shared app-runtime origin revision resolver for OOE-backed workspace jobs.
- Preserved legacy behavior for jobs without workspace-instance metadata and live active-tab behavior for jobs whose origin instance is currently visible.
- For inactive but still-open origin instances, reconstructed the current input revision from the origin instance's saved surface state instead of reading the currently visible tab.
- Threaded the resolver through shared workspace runtime launches and custom Calculate, Equation, Calculus, Table, Trigonometry, Statistics, and Geometry paths.
- Kept the intended lifecycle split: switching tabs does not cancel origin jobs; same-tab retarget increments `navigationRevision` and makes old work stale; close/Stop still request cancellation.
- Fixed the remaining display leak by writing completed outcomes only to the origin instance and not passively copying the visible display into a newly focused tab.
- Recorded the sharper failure mode from manual testing: the job could still be associated with the correct workspace instance while the active visible screen showed its completed `DisplayOutcome` if async completion looked up active tab/display state at Promise resolution time. The repair freezes launch workspace context for ticket/runtime commit routing and uses ref-backed live runtime context getters so completions write to the launch/origin instance, never to whichever tab is active later.
- Fixed the source-mirror CI failure by keeping the compartment manifest's reference-mirror entry as a neutral label instead of a concrete `playground/sources` production literal.
- Added regression coverage for origin revision resolution, edited/retargeted stale-drop evidence, and the custom Table path.
- Kept committed History global and schema-stable; no visible tab UX changes, mode-launcher context menu, projects/files, Graphing, Spreadsheet, bus, Surface Protocol, runtime registry, plugin layer, or multi-window behavior.

### 7E. `WORKSPACE-TABS-LAUNCHER-ACTIONS1`

Goal: make launcher navigation tab-aware without breaking browser-style same-tab semantics.

Implementation record, 2026-06-18:

- Added explicit launcher actions for opening hosted workspace leaves in a fresh workspace tab.
- Kept primary launcher row click, Enter/hotkey flows, and existing Open behavior as current-tab retarget.
- Added a visible row `Open in new tab` action and a right-click leaf-row context menu with `Open Here` and `Open in New Tab`.
- Routed new-tab launches through the existing workspace-tab state host.
- Kept Labs open-here only and kept Guide outside launcher-tab creation.
- Deferred `WORKSPACE-TABS-DEFAULTS1`; the `+` tab button still creates a blank Calculate tab.
- Kept committed History global and schema-stable; no projects/files, saved tab documents, second `AppMain`, second OOE authority, Supercarrier work, Graphing, Spreadsheet, bus, Surface Protocol, runtime registry, plugin layer, or multi-window behavior.

## Surface Page Policy

Workspace tabs are also the escape hatch for future full-page app surfaces, but they are not a reason to delete useful side panels.

Reason for the policy:

- Tabs are the app's general full-surface layer, not just a way to keep several calculator workspaces open.
- Some future surfaces need layouts that are too large or structurally different for the current MathEditor/result shell: full Settings, full History/Records, richer Variables management, Graphing, Spreadsheet, and similar management or canvas/grid surfaces.
- If those surfaces do not get a tab/page home, Calcwiz has only poor options: cram them into side panels, force them into the expression editor, create scattered one-off routes/modals, or make the features artificially small.
- The tab system gives the product room to grow while preserving one `AppMain`, one OOE authority, global committed History, and clear workspace-instance boundaries.

Two-tier model:

- Quick side panels stay for fast essentials while working. Examples: recent History, pending/running jobs, quick replay/copy/stop, common Settings toggles, Vars glance/edit, and developer diagnostics.
- Dedicated tab pages are for deeper management or richer interfaces. Examples: full History/Records, full Settings, richer Variables manager, Guide pages if needed, future Graphing, and future Spreadsheet.

History policy:

- The current committed History remains global and computation-record based.
- Side History should stay optimized for quick recent computation access.
- Future Graphing/Spreadsheet/artifact records should not be forced into the current `HistoryEntry` shape if they need their own saved-work or artifact manager.
- A future full History/Records tab may unify browsing/filtering across computation records and richer artifacts, but that is separate from tabs V1.

Settings policy:

- The Settings side panel should keep common quick toggles.
- A future full Settings tab can organize richer settings by category without cramming the right inspector.
- Adding a full Settings tab should not remove the quick settings side panel.

Post-V1 audit record, 2026-06-18:

- `WORKSPACE-TABS-PAGE-FOUNDATION-AUDIT0` finds tabs V1 functionally complete for current session workspace use and ready to serve as the future full-surface layer.
- The current implementation is still calculator-workspace-shaped: `WorkspaceKind = ModeId`, tab focus commits visible mode selection, and the surface-state host is adapter-based for math workspaces.
- Future full pages should first add a thin tab-surface/page-kind descriptor plus per-surface action policy. Do not add pseudo page values to calculator `ModeId`.
- Full Settings is likely the safest first page implementation candidate after the page-surface model; History/Records should audit richer record concepts before introducing artifact families.
- Graphing and Spreadsheet remain deferred to their own artifact, storage, replay, and history audits.

## Deferred Follow-Ups

These are intentionally out of V1:

- persisted tab sessions across app restarts;
- per-tab draft warning policy beyond active-job close safety;
- default new-tab workspace setting;
- full Settings page;
- full History/Records page;
- richer Variables manager page;
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
