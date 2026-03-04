# Current State

## Active Context
- Workspace: `Calcwiz`
- Active branch context: `main` on an unborn repository state in this workspace snapshot, with no upstream configured yet.
- Workflow default: commit-first with meaningful verified gates and explicit approval before commit or push.

## Current Product Phase
- Post harmonization pass for the three guided cores:
  - Geometry
  - Trigonometry
  - Statistics
- Post initial launcher/category and top-panel Guide consolidation.
- Post workflow and memory infrastructure overhaul to Memory V2.

## Stable Architecture Snapshot
- Desktop-first calculator with Tauri shell and React/TypeScript frontend.
- MathLive-backed textbook-style editing.
- Mode separation is intentional:
  - `Calculate` for general scalar/expression evaluation
  - `Equation` for solve workflows
  - domain cores for Geometry, Trigonometry, and Statistics
- Geometry, Trigonometry, and Statistics use the shared core-mode pattern:
  - one top executable draft/editor
  - guided menus and forms below
  - explicit transfers instead of implicit fallback into `Calculate`
- Guide is a top-panel utility, not a launcher app.

## Most Recent Completed Milestone
- Memory V2, checkpoint scaffolding, and lightweight task/gate workflow tooling are now defined and scaffolded in the repo.

## Current Known Risks
- The git-plan helper has only been exercised against the current unborn `main` state with no upstream, not yet against an active commit history.
- Manual desktop QA is still needed across the harmonized Geometry, Trigonometry, and Statistics cores.
- The new workflow and checkpoint infrastructure still needs real-world usage on the next multi-step task.

## Pending Verification
- Use the new `.task_tmp/` flow on the next multi-gate task and adjust if friction shows up.
- Re-check `git_plan.ps1` after the first real commit and first upstream push exist.

## Next Recommended Task
- Use the new task/gate workflow on the next substantive feature or QA pass, then checkpoint the result with a verified app summary update.
