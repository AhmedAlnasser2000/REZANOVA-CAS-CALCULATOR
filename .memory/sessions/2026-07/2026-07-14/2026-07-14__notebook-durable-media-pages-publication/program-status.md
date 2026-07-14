# Notebook Durable Media, Pages, And Publication Program

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

## Boundary

- Twelve sequential Notebook milestones from large-document readiness through Web publication.
- One verified milestone commit per named gate; the user approved all twelve commits on 2026-07-14.
- No push is authorized. Untracked `test-results/` and unrelated workspace work remain excluded.
- Display, History, solver, OOE, Surface Protocol, `AppMain`, and `ActiveSurfaceHost` ownership remain unchanged.

## Status

| Gate | Kind | Status |
| --- | --- | --- |
| `NOTEBOOK-LARGE-DOCUMENT-READINESS1` | ui | committed `4e275f06` |
| `NOTEBOOK-PERSISTENCE-FOUNDATION1` | backend | committed `a1c2b708` |
| `NOTEBOOK-DOCUMENT-LIBRARY1` | ui | committed `98530d12` |
| `NOTEBOOK-RIBBON-TABS1` | ui | committed `64f3b955` |
| `NOTEBOOK-IMAGE1` | ui | committed `b61dd6dc` |
| `NOTEBOOK-PAGE-LAYOUT1` | ui | committed `f3a9a95d` |
| `NOTEBOOK-IMAGE-LAYOUT1` | ui | committed `3356786e` |
| `NOTEBOOK-VIDEO1` | ui | committed `8b00acef` |
| `NOTEBOOK-EXPORT-PROJECTION1` | backend | committed `e4710c76` |
| `NOTEBOOK-EXPORT-PDF1` | ui | committed `4d977b2a` |
| `NOTEBOOK-EXPORT-DOCX1` | backend | committed `ecdef08f` |
| `NOTEBOOK-EXPORT-WEB1` | backend | verified; committed by this checkpoint |

## Current Handoff

- All twelve approved gates are verified and committed by the final selective checkpoint; the Notebook durable-media, pages, and publication program is complete.
- Web export creates a self-contained offline ZIP from the frozen projection for the whole document or selected top-level Sections. It contains escaped static HTML, scoped responsive/print CSS, safe static MathML, and content-hashed image, SVG, video, poster, and WebVTT assets.
- Interactive local video and captions remain live in Web packages. A strict Content Security Policy disables scripts, connections, frames, objects, remote resources, and executable author content; no editor runtime, solver authority, service worker, local path, or CDN is included.
- `.cwiznb` remains the only lossless Notebook interchange format. PDF, DOCX, and Web remain export-only publications; Microsoft 365 Word compatibility stays provisional until the separately recorded smoke test is available.
