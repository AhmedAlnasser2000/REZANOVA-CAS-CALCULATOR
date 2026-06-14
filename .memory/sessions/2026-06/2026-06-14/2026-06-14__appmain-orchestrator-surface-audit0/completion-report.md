# APPMAIN-ORCHESTRATOR-SURFACE-AUDIT0 Completion Report

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5
- contributors:
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5
- attribution_basis: live

## Task Goal

Document the remaining `src/AppMain.tsx` orchestration surface after the recent runtime, district, OOE, and CSS cleanup milestones, and recommend the next high-yield AppMain cleanup direction.

## What Changed

- Added `docs/architecture/appmain-orchestrator-surface-audit.md`.
- Classified remaining AppMain responsibilities: mode switching, settings/memory, Display/History commits, Guide dispatch, command routing, side surfaces, editor controls, and workspace rendering.
- Recorded current pressure points, including `AppMain.tsx`, `DisplayPanel.tsx`, and dormant app-logic scaffolds.
- Recommended `APPMAIN-HISTORY-DISPLAY-SHELL1` as the next major AppMain slice.
- Updated `docs/README.md`.
- Updated `.memory/current-state.md` with the current AppMain orchestration posture.

## Boundaries

- Docs/memory only.
- No production code, tests, imports, facades, runtime hooks, router logic, OOE traffic-control code, Display policy, or CSS selectors were changed.

## Verification

- Verification commands are recorded in `verification-summary.md`.

## Commits

- Same-commit milestone: APPMAIN-ORCHESTRATOR-SURFACE-AUDIT0.

## Follow-Ups

- Plan `APPMAIN-HISTORY-DISPLAY-SHELL1` if the next goal is a major AppMain cleanup slice.
- Consider separate later audits/splits for command routing, Display model assembly, dormant app-logic cleanup, and DisplayPanel.
