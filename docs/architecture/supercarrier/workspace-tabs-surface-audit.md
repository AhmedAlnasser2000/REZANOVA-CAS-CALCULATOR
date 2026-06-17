# Workspace Tabs Surface Audit

Status: `WORKSPACE-TABS-SURFACE-AUDIT0` docs/memory-only audit

Purpose: define the future workspace-tabs architecture before implementation. Tabs are session-scoped workspace instances inside one app shell. They are not multiple `AppMain` copies, not saved project files, not a second OOE authority, not a Supercarrier runtime, and not a new bus or Surface Protocol.

## Current State

`AppMain` currently owns one active mode through `currentMode`. It composes the mode strip, display shell, side surfaces, soft actions, workspace error boundary, and one visible workspace surface at a time.

App runtime hooks own mode-specific state and request wiring:

- `useHistoryDisplayRuntime` owns global History, pending history tickets, display outcome, `Ans`, commit/finalization, replay display restoration, and History persistence helpers.
- `useEquationRuntime`, `useCalculusRuntime`, `useTrigonometryRuntime`, `useStatisticsRuntime`, `useGeometryRuntime`, `useTableRuntime`, and the Linear Algebra shell runtime own singleton workspace state for the current mode surface.
- `useAppPersistenceRuntime` owns bootstrap, settings persistence, calculator-memory restore/autosave, and variable memory state.

Display and History are global shells today. `DisplayPanel` renders the active mode editor, preview, outcome, actions, and guide/runtime surfaces. `HistoryPanel` remains a global ledger of committed work, not a per-mode document store.

OOE is the only runtime traffic controller. It owns host selection, cancellation, stale-drop gates, commit legality, diagnostics, lifecycle events, and runtime evidence. Workspace tabs must not become another execution authority.

Supercarrier defines compartment ownership, dependency boundaries, diagnostics labeling, and failure containment. It does not route tab actions or interpret runtime facts.

## Future Model

The future tab model should introduce a `WorkspaceInstance` layer between the app shell and workspace surfaces:

```text
AppShell
  -> WorkspaceTabs
     -> active WorkspaceInstance
        -> WorkspaceSurfaceHost
           -> CalculateSurface | EquationSurface | CalculusSurface | TableSurface | ...
```

A workspace tab is a mounted session identity, not a document:

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

`workspaceInstanceId` is the stable identity. The tab title is a mutable runtime label for humans. It may help disambiguate pending jobs, but it must not become historical truth.

Only the active workspace surface should render by default. Inactive tabs preserve state in the workspace-instance store, but they should not remain mounted as hidden full React trees unless a later audit proves a specific surface needs warm mounting. This avoids multiple `AppMain` copies, duplicate global listeners, hidden MathLive instances, and accidental duplicate OOE launch surfaces.

## Workspace Surface Intent

Tabs are not just a way to open several copies of the current MathEditor. They are a way to let each workspace use the interface shape it deserves.

- Calculate can remain MathEditor-first as the compact quickform evaluator.
- Equation should remain a guided solve surface, with menus and specialized forms that do not have to masquerade as one editor.
- Calculus should remain a guided workspace for derivative, integral, limit, series, ODE, and partial workflows.
- Trigonometry, Statistics, Geometry, and Guide should keep their domain-specific surface shapes.
- Table can be prepared for tabs while preserving current History semantics.
- Spreadsheet and Graphing are deferred until those surfaces exist and their persistence/history model is decided.

The audit explicitly rejects adding `Projects`, `My Work`, saved tab files, document tabs, multi-window behavior, Graphing, Spreadsheet, a broad bus, or Surface Protocol as part of the first workspace-tabs architecture. Those may need their own storage and replay model later, but they are not prerequisites for session workspace tabs.

## Interaction Model

The intended UX is browser-like without copying browser document semantics.

The tab strip should support:

- a `+` button for fast new tab creation;
- a visible active tab with workspace kind and editable title;
- close buttons or a context menu for tab closure;
- keyboard and mouse switching without resetting inactive workspace state.

The initial `+` behavior should default to a blank Calculate workspace. A later settings option may let users choose the new-tab default, but V1 should avoid turning settings into a prerequisite.

Mode launcher behavior should be explicit:

- left-clicking a mode can focus the most recent existing tab for that workspace kind, or create one if none exists;
- right-clicking a mode opens workspace-management commands;
- mode switching should not destroy the previous workspace instance.

Candidate mode-launcher context commands:

- `Open`: focus or create the selected workspace kind in the current tab flow.
- `Open in New Tab`: create a new workspace instance of that kind.
- `Open Blank Tab`: create a new instance with default blank state and no history replay seed.
- `Open from Current Input`: create a new instance seeded from the active editor/display input when the target workspace supports that handoff.
- `Set as New Tab Default`: future settings action for the `+` button default.

Candidate tab context commands:

- `Rename`
- `Duplicate`
- `Close`
- `Close Others`
- `Stop Jobs in This Tab`
- `Clear Tab State`

## History And Pending Work

History should remain a global ledger of committed results. Tabs are session organization, not permanent files.

Committed History entries should stay workspace-based:

```text
Equation
Calculate
Calculus
Table
```

They should not permanently store mutable tab titles as identity. If a user renames a tab while a job is running, the pending UI may show the current tab title for disambiguation, but the committed History record should still resolve to the workspace/capability identity.

Pending/running surfaces may show tab names temporarily:

```text
Projectile equation · Equation · running
Scratch numeric check · Calculate · queued
```

Once committed, the normal History display returns to the workspace result identity. This prevents renamed tabs from creating stale or misleading historical records after the app closes.

Future OOE records should carry `workspaceInstanceId` so pending tickets, lifecycle events, diagnostics rows, stale gates, and cancellation can distinguish simultaneous tabs of the same workspace kind.

## Close Policy

Closing an idle blank tab should remove only that workspace instance state. It must not delete global History, committed results, global settings, variables, or diagnostics.

Closing a tab with active OOE work should not allow late commits. The eventual implementation should cancel or stale-drop jobs scoped to that `workspaceInstanceId` before removing the tab state. The user-facing choice can be:

- cancel running jobs and close;
- keep the tab open.

Closing a tab with draft state may later show a soft warning, but V1 should avoid inventing file/project semantics just to protect drafts. Draft preservation belongs to session state; saved work belongs to a future, separately audited storage model if Spreadsheet, Graphing, or richer workspace documents require it.

If the user closes the last tab, the app should create or focus a blank Calculate tab rather than leaving the shell empty.

## OOE Scope Rules

OOE remains the execution authority. Workspace tabs should eventually add `workspaceInstanceId` to:

- active job identity and pending tickets;
- request revision snapshots;
- lifecycle events;
- diagnostics records;
- stale-drop decisions;
- cancellation APIs;
- active/recent job inspection;
- History pending-job display.

The commit gate should be keyed by both input revision and workspace instance. A result from a closed tab must be stale-dropped even if the workspace kind still exists in another tab.

Tab titles are never part of commit legality. They are display labels only.

## Future Implementation Candidates

These are audit findings, not roadmap commitments:

- `WORKSPACE-INSTANCE-MODEL1`: define the `WorkspaceInstance` state model, tab ids, active-tab selection, title rules, close policy, and session restore posture.
- `OOE-WORKSPACE-INSTANCE-SCOPE1`: add `workspaceInstanceId` to OOE job identity, tickets, diagnostics/events, stale gates, and cancellation semantics.
- `WORKSPACE-TABS-SHELL1`: add the visible browser-style tab strip and mode-launcher context commands after the state and OOE scope are defined.

Do not implement the visible shell before the instance model and OOE scope are planned. The risky part is not the tab UI; it is preserving one app shell, one OOE authority, and correct stale-drop behavior across simultaneous workspace instances.

## High-Risk Contracts

- One app shell only. Do not render multiple `AppMain` copies.
- One OOE authority only. Tabs do not route, decide, cancel, commit, or stale-drop outside OOE.
- Global settings, variable memory, diagnostics, and committed History remain global unless a future audit changes that boundary.
- Workspace state is per-instance; historical result identity is per workspace/capability.
- Inactive tabs preserve state without hidden full React trees by default.
- Spreadsheet and Graphing persistence is deferred until those surfaces exist.
- Supercarrier remains boundary architecture, not a tab runtime.

## Stop Rules

Stop and re-plan if implementation would require:

- multiple `AppMain` trees;
- a second OOE registry or execution authority;
- a broad event bus, Surface Protocol, runtime registry, command authority, plugin layer, or generated source;
- project/file semantics, `My Work`, saved tab documents, or multi-window behavior;
- Graphing or Spreadsheet support as a prerequisite;
- permanent History identity based on mutable tab titles;
- changing solver behavior, Display policy, History schema, OOE event types, worker-host ids, CSS, app-state persistence, or replay behavior inside a tabs audit.

## Verification

This audit is docs/memory only. Verification for `WORKSPACE-TABS-SURFACE-AUDIT0`:

- `npx tsc -b --pretty false`
- `npm run test:compartments-boundaries`
- `npm run test:file-sizes`
- `npm run test:memory-protocol`
- `git diff --check`
- `git status --short`
