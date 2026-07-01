# TRACK-WORKSPACE-APP-FRAME-AUDIT0 Manual Verification Checklist

## What Is Achieved Now

- The audit records that Workspace Tabs are currently mounted inside `.calculator-shell`.
- The target product boundary is locked: Workspace Tabs belong to app chrome, while the calculator shell is only one active surface renderer.
- The next safe sequence is app-frame tab lift, active surface host, page-surface model, then full Settings/History pages.
- Graphing remains deferred until it can be a full canvas/scene surface outside the calculator shell.

## Manual App Steps

- Open the current app and confirm the tab strip appears inside the large rounded calculator shell.
- Open or create multiple workspace tabs and confirm tab actions still behave as session workspace tabs.
- Open quick History, Settings, and Vars side panels and note that they remain quick side panels, not full page tabs.
- Review the future app-frame target before implementing any full page: tab strip should sit above the active surface, and calculator-like workspaces should render inside the calculator shell below it.

## Expected Results

- Current behavior is understood as a placement problem, not a workspace-instance runtime failure.
- No full Settings, full History/Records, Variables page, Graphing, Spreadsheet, Surface Protocol, plugin, or website mount work is authorized by this audit.
- The first implementation milestone should move the tab strip to app-level chrome while preserving existing workspace behavior.
