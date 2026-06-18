# TRACK-WORKSPACE-TABS-STABILITY1 Manual Verification Checklist

Milestone: `WORKSPACE-TABS-STABILITY1`
Date: 2026-06-18
Agent: codex
Model: gpt-5

## What Is Achieved Now

- [x] Workspace tabs are visible above the mode strip.
- [x] `+` creates a blank Calculate tab.
- [x] Normal launcher row clicks retarget the active tab.
- [x] Hosted runtime launcher leaves expose explicit `Open in new tab`.
- [x] Launcher leaf right-click menus expose `Open Here` and `Open in New Tab`.
- [x] Root launcher category rows do not expose leaf new-tab actions.
- [x] Labs remains open-here only in covered tests.
- [x] Committed History remains global and workspace-based.
- [x] The app still uses one AppMain, one active rendered workspace surface, and one OOE authority.

## Manual App Steps

- [x] Start the app and confirm one active `Calculate` tab is visible.
- [x] Click `+`; confirm a second blank `Calculate` tab appears and becomes active.
- [x] Open `Menu`, choose `Calculus`, then click the primary `Calculus` launcher row; confirm the tab count does not increase and the active tab becomes `Calculus`.
- [x] Open `Menu`, choose `Core`, click the `+` action on the `Equation` launcher row; confirm a new active `Equation` tab appears.
- [x] Open `Menu`, choose `Core`, right-click `Table`; confirm the menu shows only `Open Here` and `Open in New Tab`, then choose `Open in New Tab` and confirm a new active `Table` tab appears.
- [x] Open `Menu` at the category/root level; confirm category rows do not show the launcher `+` action and right-clicking a category does not open a leaf action menu.
- [x] Use the active `Table` tab menu, choose `Rename`, set `QA Table`, and confirm only the human label changes.
- [x] Use the renamed tab menu, choose `Duplicate`, and confirm a focused `QA Table copy` tab appears while the original remains.
- [x] Close an idle duplicated tab and confirm other tabs remain open.
- [x] Run a simple calculation in one Calculate tab, switch to another tab, then return and confirm the result stayed with the origin tab.
- [x] Start a job in one tab, switch tabs before completion, and confirm the active tab is not overwritten by the origin tab result.
- [x] Start a job, retarget that same tab to another workspace before completion, and confirm any late old result does not render into the retargeted workspace.
- [x] If a tab shows active work, try closing it; confirm the app asks whether to cancel jobs before closing.
- [x] Confirm side-panel buttons such as `Guide`, `Settings`, `Vars`, and `Show Hist` still behave like quick side panels, not new workspace tabs.

## Expected Results

- [x] Normal launcher selection behaves like same-browser-tab navigation.
- [x] New workspace instances appear only through explicit actions: tab click, `+`, duplicate, or `Open in New Tab`.
- [x] Tab labels can change without changing workspace kind, committed History identity, or job legality.
- [x] Results, `Ans`, runtime status, and display state remain scoped to the origin workspace tab.
- [x] Pending/running rows may use launch-time tab labels for disambiguation, but finalized History rows stay workspace-based.
- [x] Closing or retargeting a tab cannot allow stale work to visibly commit into the wrong tab.
- [x] Tabs do not replace quick side panels; they remain the future full-surface layer for richer pages.

User QA confirmation: completed by the user on 2026-06-18.

## Codex Verification Snapshot

- [x] Focused workspace tab UI tests passed.
- [x] Focused OOE/job-launch/runtime tab-adjacent tests passed.
- [x] `npx tsc -b --pretty false` passed.
- [x] `npm run test:memory-protocol` passed before adding this checklist.
- [x] `npm run test:compartments-boundaries` passed.
- [x] `npm run lint` passed.
- [x] `npm run build` passed with existing Vite dynamic/static import chunking warnings.
- [x] `git diff --check` passed before adding this checklist.
- [x] Headless browser smoke pass verified plus tab, same-tab retarget, visible new-tab launcher action, launcher context menu new-tab action, root-row no-actions, rename, and duplicate.
