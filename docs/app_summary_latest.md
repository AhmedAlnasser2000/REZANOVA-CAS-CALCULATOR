# Calcwiz App Summary

## Snapshot
- Date: 2026-03-04
- Context: post three-core harmonization and workflow/memory infrastructure overhaul

## Product State
- Launcher navigation is category-based and digit-driven.
- Guide is a top-panel utility rather than a launcher app.
- `Calculate` remains the general expression surface.
- `Equation` remains the dedicated solve surface.
- Geometry, Trigonometry, and Statistics each use the shared core-mode pattern:
  - one top executable editor/draft
  - guided menus and forms below
  - explicit cross-mode transfers

## Core Status
### Geometry
- Fully migrated to the shared Geometry core.
- 2D shapes, 3D solids, triangles, circles, and coordinate geometry all run through the same top editor surface.

### Trigonometry
- Fully migrated to the shared Trigonometry core.
- Functions, identities, equations, triangles, angle conversion, and special angles all stay inside Trigonometry instead of depending on `Calculate` as the editor surface.

### Statistics
- Fully migrated to the shared Statistics core.
- Data entry, descriptive statistics, frequency, probability, regression, and correlation now run through one top editor surface with guided builders below.

## Cross-Mode Consistency
- Calculate direct numeric trig now respects the global angle setting without breaking explicit radian expressions such as `sin(pi/2)`.
- Guide copy and workbench UX were recently tightened across Geometry, Trigonometry, and Statistics.

## Workflow State
- Durable memory is now intended to be tracked in git.
- Temporary task tracking is intended to live under `.task_tmp/`.
- Commit-first plus meaningful verified gates is now the documented default workflow.

## Verification Notes
- This summary reflects the currently documented and implemented state of the app in this workspace.
- Validation passed with:
  - `npm run build`
  - `npm run lint`
  - PowerShell smoke tests for `tools/dev/task_session.ps1`
  - PowerShell smoke tests for `tools/dev/git_plan.ps1`
- The git workflow helpers were verified against the current unborn `main` branch with no upstream configured yet.
- A future checkpoint archive entry should be created once the workflow has been used on a full task cycle with real commits and an upstream branch.
