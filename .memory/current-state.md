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
- Track A (Solver/Equation) A1-A3 is implemented:
  - Range Guard v2 coverage hardening
  - Trig-first symbolic substitution expansion with exp/log parity fixes
  - Numeric Solver v2 with bracket-first bisection plus local-minimum recovery

## Current Known Risks
- Local-minimum numeric recovery thresholds may need tuning on edge functions with shallow minima.
- Some Compute Engine rule checks still print noisy stderr warnings during tests, even though assertions pass.
- Manual desktop QA is still needed for solver UX messaging across Equation and Trigonometry handoff flows.

## Pending Verification
- Manual solve-flow QA on:
  - exp-notation substitution (`exp(2x)-5exp(x)+6=0`)
  - tan-polynomial substitution families
  - numeric interval no-root guidance and local-minimum recovery
- Re-check `git_plan.ps1` after the first real commit and first upstream push exist.

## Next Recommended Task
- Start Track B (Trigonometry) symbolic deepening on top of the upgraded Track A solver backend.
