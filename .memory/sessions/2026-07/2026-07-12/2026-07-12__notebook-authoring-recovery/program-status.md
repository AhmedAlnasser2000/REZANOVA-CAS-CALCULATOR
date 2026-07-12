# Notebook Authoring Recovery And Enhancement Status

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.6
- primary_agent_family: sol
- contributors:
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.6
- recorded_by_agent_family: sol
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.6
- verified_by_agent_family: sol
- attribution_basis: live

## Goal

Recover Notebook authoring ergonomics through recursive hierarchy, local transient-layer policy, reliable selection formatting, one floating Math Authoring surface, and a dynamically resizable workbench.

## Current Gates

- `NOTEBOOK-NESTED-SECTION-HIERARCHY1`: passed, ui, committed as `11ff1162`.
- `NOTEBOOK-TRANSIENT-LAYER-DISMISSAL1`: passed, ui, entering its approved commit checkpoint.
- `NOTEBOOK-SELECTION-FORMATTING-PALETTES1`: pending.
- `NOTEBOOK-MATH-AUTHORING-SURFACE1`: pending.
- `NOTEBOOK-WORKBENCH-RESIZE-POLISH1`: pending.

## Shared-Tree Boundary

- Notebook owns Notebook page/components/styles/tests, `src/lib/notebook/**`, Notebook-focused browser tests, and this dossier.
- Concurrent output-inversion/result-document work owns non-Notebook runtime, producer, result-contract, inversion-registry, and tool files.
- App state, Tauri, History, Display, Surface Protocol, Model Context Protocol, solver files, and untracked `test-results/` remain excluded.
- Live evidence, History attachment, package, import/export, and result-derived Notebook work remain paused until output inversion publishes a stable Notebook-facing result projection.

## Locked Product Rules

- Sections are visible recursive document structure, not outline-only folders.
- One non-repeated Escape closes one Notebook transient layer; app tabs and permanent desktop panes are unaffected.
- Prose selection formatting uses separate text-color and highlight palettes.
- Notebook math authoring uses one draggable REZANOVA surface; MathLive recipes remain internal implementation details.
- Pane widths and floating-surface position are per-tab session UI state, outside document/package DTOs.
