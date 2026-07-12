# Notebook Rich Authoring Program Status

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.6
- primary_agent_family: terra
- contributors:
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.6
- recorded_by_agent_family: terra
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.6
- verified_by_agent_family: terra
- attribution_basis: live

## Goal

Replace the separate Notebook textarea and preview with a continuous rich prose-and-math authoring canvas, backed by app-owned documents and a Notebook-local MathLive keyboard.

## Current Gate

- `NOTEBOOK-RICH-DOCUMENT-MODEL1`: passed, backend, committed as `f16e149b`.
- `NOTEBOOK-MATH-FIELD-ACTIVATION1`: passed, ui, committed as `f35d4164`.
- `NOTEBOOK-AUTHORING-KEYBOARD1`: passed, ui, entering its approved commit checkpoint.
- Next: `NOTEBOOK-INLINE-MATH-CANVAS1`.

## Shared-Tree Boundary

- The concurrent History persistence lane owns dirty app-state, History runtime, Tauri, and History parity files.
- Notebook work owns Notebook source, styles, tests, new Notebook subfolders, the six approved package pins, and its own memory hunks.
- Shared MathEditor, Clipboard, expression routing, printer/display contracts, AppMain, and ActiveSurfaceHost remain excluded.
- Cross-agent handoff basis: user-provided lane permission plus the live History program dossier; no Notebook file was dirty at entry.
- Concurrent result-contract work owns dirty result/document contracts, calculator result types, Equation producers, worker clients, replay fixtures, and ratchet tooling. Its one-line `runtime-types.ts` cap overage is an external file-size blocker and is not part of Notebook staging.

## Product Decisions

- One app tab equals one Notebook document; a saved-document library waits for local persistence.
- Local persistence is required later, but this program uses workspace surface state and a test-only in-memory port adapter.
- Model Context Protocol and Surface Protocol widening remain out of scope.
- Approved mock source: `/home/ahmed/Documents/Generated image 1.png`.
