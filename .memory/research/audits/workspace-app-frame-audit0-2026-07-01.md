# WORKSPACE-APP-FRAME-AUDIT0: Workspace Tabs App-Frame Boundary Audit

## Attribution
- primary_agent: codex
- primary_agent_model: gpt-5-codex
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5-codex
- verified_by_agent: codex
- verified_by_agent_model: gpt-5-codex
- attribution_basis: live

## Summary

The current Workspace Tabs runtime is the right foundation, but the visual/layer placement is wrong for the next product step.

The live app mounts `WorkspaceTabs` inside `.calculator-shell`, immediately before `FormulaViewerWorkspaceGate` and `ModeStrip`. The CSS then styles `.calculator-shell` as the big rounded calculator chassis and `.workspace-tabs-shell` as a panel inside it. That makes every tab appear to belong to the calculator body.

That is acceptable for Calculate, Equation, Calculus, and similar calculator-like workspaces. It is not acceptable for full History, full Settings, richer Variables, Formula Viewer as a full workspace, future Spreadsheet, or future 2D/3D Graphing. Those surfaces need app-level room and different visual affordances; Graphing especially should not be forced into the calculator chassis.

## Verified Repo Evidence

- `src/AppMain.tsx` currently renders:
  - `.app-shell`
  - `.app-stage`
  - `.calculator-shell`
  - `WorkspaceTabs`
  - `FormulaViewerWorkspaceGate`
  - `ModeStrip`
- `src/styles/app/shell.css` styles `.calculator-shell` as the large rounded calculator container with shell border, background, padding, grid gap, and UI-scale zoom.
- `src/styles/app/shell.css` styles `.workspace-tabs-shell` as an internal strip with its own rounded panel background inside that container.
- `src/app/runtime/useWorkspaceTabsRuntime.ts` and related state-host/runtime files already carry the useful part: one app shell, one active instance, stable `workspaceInstanceId`, per-instance surface/display/runtime state, explicit tab actions, and Order of Execution scoping.
- `.memory/research/roadmaps/workspace-tabs-roadmap.md` already states tabs are the future full-surface escape hatch, but the live mount location currently contradicts that product posture.

## Diagnosis

The problem is not the workspace-instance model. The problem is that the tab strip is visually and structurally nested under the calculator surface.

Current mental model:

```text
AppShell
  AppStage
    CalculatorShell
      WorkspaceTabs
      ModeStrip
      Calculator-like workspace content
```

Target mental model:

```text
AppShell
  AppFrameChrome
    WorkspaceTabs
  ActiveSurfaceHost
    CalculatorShell for calculator-like workspaces
    FullPageSurface for History, Settings, Variables, Guide pages
    CanvasSurface for future Graphing or other visual scenes
```

Tabs should be app-surface tabs, not calculator-shell tabs.

## Locked Boundary

- Workspace Tabs belong to app chrome.
- The calculator shell is one surface renderer, not the owner of all tabbed surfaces.
- Calculator-like workspaces may continue to use the existing calculator shell, mode strip, editor/result layout, and keypad.
- Full-page management surfaces must not inherit the calculator shell, keypad, MathEditor/result-shell mental model, or calculator chassis constraints.
- Future Graphing must be a full app-surface/canvas tab, not a panel inside the calculator shell.
- The existing workspace-instance runtime, inactive-state preservation, Display state hosting, Order of Execution workspace scoping, stale/drop rules, and global committed History should be preserved.
- Do not introduce multiple `AppMain` instances, a second Order of Execution authority, a broad event bus, projects/files, saved-work models, Surface Protocol work, plugins, or external software development kit work in this correction.
- Do not add pseudo page values to `ModeId`. Full pages need a thin tab-surface/page-kind descriptor and action policy.
- Quick side panels remain useful for fast History, Settings, Variables, and diagnostics while working; dedicated pages are richer companions, not replacements.

## Recommended Milestone Sequence

### 1. `WORKSPACE-TABS-APP-CHROME1`

Move `WorkspaceTabs` from inside `.calculator-shell` to app-level chrome above the active surface.

Scope:

- Add an app-frame/chrome wrapper for the tab strip.
- Keep all existing tab runtime behavior and tab actions.
- Keep calculator-like active workspaces visually unchanged below the new app-frame tab strip as much as practical.
- Keep side panels and overlays working.
- Do not add History, Settings, Variables, Graphing, or new page tabs yet.

Acceptance:

- The tab strip reads like browser/app chrome, not a calculator panel.
- Calculate/Equation/Calculus still use the calculator shell below the tabs.
- Tab switching, plus-created Calculate, rename, duplicate, close, close others, stop jobs, clear state, History replay, Auto Equation handoff, and inactive-tab completion behavior remain intact.

### 2. `WORKSPACE-ACTIVE-SURFACE-HOST1`

Make the active tab render through an explicit surface host.

Scope:

- Introduce a small internal active-surface classification:
  - calculator-like workspace surface
  - full-page app surface
  - special viewer/canvas surface
- Keep the first implementation behavior-equivalent for existing calculator-like workspaces.
- Do not create new page workspaces yet.

Acceptance:

- Calculator-like workspaces route through `CalculatorShell`.
- Non-calculator surfaces have a named future path that can bypass `CalculatorShell`.
- The classification stays internal; public app behavior is unchanged except for any already-approved app-frame visual lift.

### 3. `WORKSPACE-PAGE-SURFACE-MODEL1`

Define the first page-surface descriptor and tab-action policy.

Scope:

- Add page/surface identifiers outside `ModeId`.
- Decide tab title defaults, close/duplicate/clear policy, and whether pages can have multiple instances.
- Define how focusing a page preserves the last runtime `currentMode` for calculator-like actions.
- Keep History, Settings, and Variables data schemas unchanged.

Recommended first page candidate:

- Full Settings is the safest first implementation page after the model because it mostly organizes existing settings state.
- Full History/Records should follow with a separate record/artifact audit, because future Graphing/Spreadsheet artifacts should not be forced into the existing computation `HistoryEntry` schema.

### 4. `SETTINGS-PAGE1`

Build the first full-page management surface.

Scope:

- Categorized full Settings surface outside the calculator shell.
- Keep quick Settings side panel for common toggles.
- No Graphing, no History schema work, no persistence migration beyond existing settings state.

### 5. `HISTORY-RECORDS-PAGE-AUDIT0` then `HISTORY-PAGE1`

Audit and then build richer History/Records.

Scope:

- Preserve current committed History as global computation records.
- Keep side History for quick recent work.
- Decide how future non-computation artifacts will coexist before widening the full page into a broader records manager.

### Later: Graphing

Graphing should wait until:

- app-frame tabs exist,
- the active surface host can bypass the calculator shell,
- numerical solving and domain/fact output are stable enough to feed graphing honestly,
- Graphing has its own scene/runtime/storage/history audit.

Future Graphing should own a full canvas surface with graph toolbar, object list, inspector, and 2D/3D scene room. It should not be mounted inside the calculator chassis.

## Stop Rules

Stop and re-plan if the implementation tries to:

- make calculator shell the permanent parent of full pages or canvas surfaces;
- add History/Settings/Variables as fake `ModeId` entries;
- build Graphing before the app-frame and surface-host boundary lands;
- duplicate `AppMain`;
- mount inactive full workspaces as hidden React trees;
- make tabs decide Order of Execution commit legality;
- replace quick side panels before full pages prove themselves;
- mix Surface Protocol, plugins, external software development kit, or website mounting into this app-frame correction.

## Verification Notes

- `npm run test:surface-protocol` passed during this audit: Surface Protocol production boundary plus 9 Surface Protocol test files and 39 tests passed.
- `npx tsc -b --pretty false` still fails on Surface Protocol test typing only:
  - `src/lib/surface-protocol/dto.test.ts`
  - `src/lib/surface-protocol/spec-examples.test.ts`
- `npm run test:gate` reached `test:unit` and failed with 14 unrelated Equation/Calculus/integration unit assertions. Surface Protocol, app identity, pillars, golden, labs catalog, source mirrors, area studies, Order of Execution boundaries, compartment boundaries, and file sizes had already passed inside the gate.
