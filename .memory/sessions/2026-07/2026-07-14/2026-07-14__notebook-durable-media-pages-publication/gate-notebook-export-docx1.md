# NOTEBOOK-EXPORT-DOCX1

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

- kind: backend
- status: verified under standing user commit approval
- boundary: `.docx` is a best-effort editable publication only; no `.doc`, DOCX import, linked-file state, History mutation, Tiptap JSON parsing, or round-trip promise was added.

## Implemented

- File backstage offers whole-document or selected top-level Section Word export from the frozen `NotebookPublicationProjectionV1` snapshot.
- The permissive `docx` 9.7.1 package builds OOXML for headings, prose marks/formatting, styled nested lists, page setup, breaks, headers/footers, page numbering, figures/captions, structured academic tables, Sections, images, and static video poster/text notes.
- A bounded fail-closed LaTeX converter emits editable OMML for its audited subset. Unsupported equations use an escaped SVG visual plus PNG fallback and are reported before export.
- Supported equations use OOXML alternate content: current Word receives editable OMML while readers without OMML support, including the verified LibreOffice path, receive the embedded SVG/PNG visual.
- Accepted SVG images remain vector-backed with PNG fallbacks. JPEG/PNG stay native; WebP is rasterized to PNG. Browser rasterization is bounded to a 2,048-pixel maximum side.
- The DOCX dialog is lazy-loaded so the format adapter does not inflate the normal Notebook interaction path.

## Evidence

- model: 11 focused publication tests pass. Three DOCX cases inspect the generated ZIP parts for OMML, alternate content, numbered lists, media relationships, SVG/PNG fallbacks, running matter, page geometry, structured blocks, and static video text.
- UI: 2 focused dialog cases pass for compatibility-before-export, document/Section scope, empty-Section guarding, non-round-trip copy, and Escape dismissal.
- Chromium: the dedicated real-download scenario passes at 2400px, 1440px, and 1100px plus 80%, 130%, and forced colors. The dialog remains contained with zero page overflow, the downloaded bytes have a ZIP signature, and screenshots were visually inspected.
- OOXML: `unzip -t` reports no compressed-data errors; the package contains editable math, alternate SVG/PNG equation content, numbering, headers/footers, and image relationships.
- LibreOffice: LibreOffice 26.2.2.2 opens the real Worked Example export and renders its heading, prose, academic containers, evidence, and all equation visuals to a one-page PDF. The first OMML-only probe exposed blank equations; the final alternate-content package corrected that failure.
- Microsoft Word: no Microsoft 365 runtime is available in this Linux environment, so Word compatibility remains provisional despite current OOXML/OMML structures and the required smoke is explicitly outstanding.
- static: focused ESLint passes; production Vite build passes with existing chunk warnings; production dependencies report zero audit vulnerabilities; exact-patch TypeScript passes in a detached clean worktree after excluding two pre-existing foreign test-fixture errors.
- resource: no full unit/UI/canary suite ran. Preview and Playwright processes stopped, the clean worktree was removed, and ignored `.task_tmp/`, untracked `test-results/`, and concurrent clipboard/result-contract/OOE files remain excluded.
