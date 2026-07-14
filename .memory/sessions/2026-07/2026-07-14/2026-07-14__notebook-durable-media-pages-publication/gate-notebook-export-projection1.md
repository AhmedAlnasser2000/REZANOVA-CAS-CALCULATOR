# NOTEBOOK-EXPORT-PROJECTION1

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- primary_agent_family: sol
- contributors:
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- recorded_by_agent_family: sol
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- verified_by_agent_family: sol
- committed_by_agent: codex
- committed_by_agent_model: gpt-5.5
- committed_by_agent_family: sol
- attribution_basis: live

## Gate

- milestone: `NOTEBOOK-EXPORT-PROJECTION1`
- kind: backend
- status: verified; committed by the checkpoint containing this entry
- approval: standing user approval recorded on 2026-07-14
- push_authorization: none

## Implemented Contract

- `NotebookPublicationProjectionV1` is the only input contract for later PDF, DOCX, and Web adapters. It contains app-owned Notebook blocks, source identity/revision, page setup, running matter, derived page fragments, target-required resolved assets, export scope, and a versioned compatibility report; it contains no Tiptap JSON, editor DOM, rendered calculator output, or History mutation surface.
- `NotebookExportRequest` supports whole document, exact physical PDF page range, or selected top-level Section subtrees. Section requests are normalized to document order. DOCX and Web reject physical page ranges and report target reflow rather than preserving fictional source page numbers.
- PDF/DOCX static-video projections resolve only posters and descriptive metadata; Web projections retain video and WebVTT assets. Missing or undeclared required assets fail before an adapter runs.
- The compatibility report always counts static-video substitutions, equation fallbacks, font substitutions, and layout approximations. Format adapters may contribute audited equation/font/layout findings during preflight.
- Publication jobs clone the current stored record and derived layout when queued, run through a low-priority scheduler independently from mounted Notebook pages, support cancellation, reuse one stable result promise, and never mutate the source record or History.

## Verification Evidence

- Focused publication evidence passes 8 tests for immutable PDF projection, Web interactive assets, document-order Section scope, exact page-range geometry, invalid-scope rejection, frozen revision behavior, low-priority scheduling, cancellation, missing assets, and source non-mutation.
- Incremental TypeScript and Notebook-publication ESLint pass.
- File-size validation and diff hygiene pass; the new production files remain between 3 and 271 lines.
- No UI, document-version, Rust storage, Tauri, solver, OOE, History, Display, `AppMain`, or `ActiveSurfaceHost` behavior changed. No Playwright or production build was required for this backend-only contract gate.
- Concurrent Canonical Result/OOE work and untracked `test-results/` remain excluded.

## Handoff

- `NOTEBOOK-EXPORT-PDF1` is next.
- The PDF gate must render only from the projection, preserve V8 physical pages, expose the platform Print/Save as PDF flow, and apply the report's static-video policy.
