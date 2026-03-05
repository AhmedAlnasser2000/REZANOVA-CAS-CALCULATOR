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
- Delivered the sequence `B1 -> A5 -> B2/B3`:
  - B1: bounded affine trig equation solve expansion (`kx+b` arguments, linear wrappers)
  - A5: bounded log-combine sum support (`ln(u)+ln(v)=c`, `log(u)+log(v)=c`) with domain filtering
  - B2/B3: bounded trig structural/toolkit growth including mixed same-argument linear family `a*sin(A)+b*cos(A)=c`
  - required manual checklist artifacts added for B1, A5, and B2/B3

## Current Known Risks
- Local-minimum numeric recovery thresholds may need tuning on edge functions with shallow minima.
- Some Compute Engine rule checks still print noisy stderr warnings during tests, even though assertions pass.
- Broader log transforms (`ln(u)-ln(v)`, ratio/power forms) remain intentionally out of bounded scope and should keep explicit unsupported messaging.

## Pending Verification
- Run the new manual checklists in app:
  - `.memory/research/TRACK-B1-MANUAL-VERIFICATION-CHECKLIST.md`
  - `.memory/research/TRACK-A5-MANUAL-VERIFICATION-CHECKLIST.md`
  - `.memory/research/TRACK-B2-B3-MANUAL-VERIFICATION-CHECKLIST.md`
- Keep the Track E manual checklist in parallel:
  - `.memory/research/TRACK-E-MANUAL-VERIFICATION-CHECKLIST.md`
- Re-check `git_plan.ps1` after the first real commit and first upstream push exist.

## Next Recommended Task
- Run and record the three new manual checklists, then choose the next bounded follow-up:
  - Track A continuation for broader log transforms
  - or Track C geometry depth expansion
