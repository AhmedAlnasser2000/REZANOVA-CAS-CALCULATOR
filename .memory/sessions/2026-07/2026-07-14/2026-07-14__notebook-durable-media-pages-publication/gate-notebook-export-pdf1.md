# NOTEBOOK-EXPORT-PDF1

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
- attribution_basis: live

## Gate

- kind: ui
- status: verified under standing user commit approval
- boundary: PDF remains a read-only publication projection; no PDF bytes, import, linked-file state, History mutation, or editor-DOM parsing was added.

## Implemented

- File backstage opens a scoped compatibility preview for the frozen current in-memory revision.
- Whole-document, exact physical-page, and selected top-level Section scopes render from `NotebookPublicationProjectionV1`.
- A dedicated typed React renderer handles rich prose, headings, lists, static MathLive markup with selectable source fallback, evidence, structured blocks, safe images/SVG, caption numbering, crop/rotation/wrapping preferences, and static video poster/text notes.
- V8 paper geometry, margins, headers, footers, page numbering, explicit breaks, measured fragments, and selected-Section repagination own the physical page projection.
- The system print/Save as PDF flow uses `window.print()` and Tauri's explicit `core:webview:allow-print` capability; no second PDF layout engine or direct byte generator exists.

## Evidence

- model: 9 publication tests pass, including immutable scope/asset behavior and MathLive fallback preflight.
- UI: 2 focused dialog/renderer tests pass for compatibility reporting, static video substitution, physical page range, selected Sections, and system-print invocation.
- adjacent UI: 28 of 29 Notebook page tests pass; the only failure is a concurrent clipboard adapter change requiring `FileList.item()`, outside this gate.
- Chromium: the dedicated scenario passes at 2400px, 1440px, and 1100px plus 80%, 130%, and forced colors. Preview containment, two-page running matter, exact page 2 scope, zero document overflow, and print invocation pass.
- visual inspection: dark previews keep a deliberate white paper surface with legible black publication text; the 1100px view scrolls the paper inside its preview rather than widening the app; forced colors keeps controls, numbers, and paper content readable.
- static: focused ESLint, file-size validation, memory validation, diff hygiene, and exact-patch incremental TypeScript from clean `e4710c76` pass. The shared-checkout recheck is temporarily blocked by a concurrent OOE diagnostics fixture type error outside Notebook ownership.
- resource: no full unit/UI/canary suite or redundant production build ran; Vite and Playwright processes were stopped, and `test-results/` remains untracked.
