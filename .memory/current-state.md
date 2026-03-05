# Current State

## Active Context
- Workspace: `Calcwiz`
- Active branch context: `main` with local milestone commits and no upstream configured yet in this workspace.
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
- Track A4 (Exp/Log Solve Completion, bounded guarded scope) is implemented on top of A1-A3:
  - bounded exp-polynomial substitution parity for `e^(...)` and `exp(...)`
  - bounded inverse isolation for `ln`, common `log`, `exp`, and `a^x` with stable recursion/cycle handling
  - consistent substitution diagnostics family metadata and Equation/Trigonometry provenance alignment
  - required manual checklist artifact added at `.memory/research/TRACK-A4-MANUAL-VERIFICATION-CHECKLIST.md`

## Current Known Risks
- Local-minimum numeric recovery thresholds may need tuning on edge functions with shallow minima.
- Some Compute Engine rule checks still print noisy stderr warnings during tests, even though assertions pass.
- Bounded log-combination families (for example `ln(x)+ln(x+1)=2`) remain intentionally unsupported and require explicit messaging QA.

## Pending Verification
- Run the new Track A4 manual checklist in app:
  - `.memory/research/TRACK-A4-MANUAL-VERIFICATION-CHECKLIST.md`
- Keep the Track E manual checklist in parallel before Track B stabilization:
  - `.memory/research/TRACK-E-MANUAL-VERIFICATION-CHECKLIST.md`
- Re-check `git_plan.ps1` after the first real commit and first upstream push exist.

## Next Recommended Task
- Start Track B (Trigonometry) symbolic deepening, while keeping Track A5/A4 follow-up candidates scoped to deferred log-combination and broader exp/log family work.
