# FORMULA-VIEWER-VIRTUALIZATION1 Completion Report

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5-codex
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5-codex
- verified_by_agent: codex
- verified_by_agent_model: gpt-5-codex
- attribution_basis: live

## Gate

- Gate label: ui
- Scope: Formula Viewer-only virtualization for huge structured formula artifacts.

## Summary

Huge formula answers now stay compact in the source Equation result while the dedicated Formula Viewer tab owns full inspection through a virtualized scroll surface. The viewer renders only visible structured Display blocks and case rows plus overscan, while keeping collapsed detail bodies and over-budget rows lightweight.

## Completed

- Added a Display-owned Formula Viewer virtual item planner for primary blocks, global facts, detail headers, case group headers, and case rows.
- Added a virtualized Formula Viewer content surface using `.formula-viewer-scroll` as the only scroll owner.
- Added measured-height updates with safe zero-height filtering so hidden/jsdom measurements do not collapse estimates.
- Preserved existing per-row render budgets inside the viewer; giant rows remain opt-in through `Show formula row`.
- Kept collapsed detail bodies unmounted until opened, including heavy `caseMath` details.
- Reset virtual measurements and opened row state when the artifact/result signature changes.
- Preserved Copy Result, Back to source, row-local guards, global facts, source-card compactness, solver behavior, formula semantics, OOE, History, app-state, Tauri, and persisted schemas.

## Durable Memory Updated

- `.memory/current-state.md`
- `.memory/decisions.md`
- `.memory/journal/2026-06/2026-06-26.md`
- `.memory/sessions/2026-06/2026-06-26/2026-06-26__formula-viewer-virtualization1/`
