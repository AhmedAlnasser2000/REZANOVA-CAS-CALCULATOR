# World Canon

## Product Invariants
- Version 1 is Linux-first in platform sequencing, while the codebase should preserve cross-platform ground for Windows/macOS.
- `Calculate` is the general expression surface. It simplifies and evaluates expressions but does not own equation-solving workflows.
- `Equation` owns solve workflows and equation-specific editing.
- Guide is a persistent top-panel utility and global help surface, not a launcher app.
- Launcher navigation is category-based and digit-driven.
- Geometry, Trigonometry, and Statistics follow the shared core-mode contract:
  - one top executable draft/editor
  - guided menus and forms below
  - explicit cross-mode transfers
  - no implicit fallback into `Calculate` for editing

## Engineering Invariants
- Memory, checkpoints, and temporary task tracking must never affect runtime behavior.
- Durable memory is tracked in git; heavy and transient memory areas stay ignored.
- Verified app-state summaries live under `docs/checkpoints/` and `docs/app_summary_latest.md`.
- Temporary task tracking lives under `.task_tmp/` and stays out of git history.

## Workflow Invariants
- Commit-first is the default workflow for this repo.
- The standard checkpoint unit is a meaningful verified gate, not a physical slice or worktree.
- Explicit approval is required before commit and before push.
- Worktrees and extra branches are exceptions for isolation, not the default operating model.
- Wrong-branch recovery should use a patch artifact, not human memory.
- `AGENTS.md` is the authoritative cross-agent workflow and governance file for this repo.
- Durable memory attribution must follow `.memory/PROTOCOL.md`, and compatibility stubs must defer to `AGENTS.md`.
