# NOTEBOOK-EXPORT-WEB1

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
- boundary: Web ZIP is a read-only offline publication only; no Web import, editor runtime, solver authority, remote media, service worker, script execution, cloud state, or Notebook mutation was added.

## Implemented

- File backstage offers whole-document or selected top-level Section Web export from a frozen `NotebookPublicationProjectionV1` snapshot.
- The ZIP contains `index.html`, scoped responsive/print CSS, and content-hashed local PNG/JPEG/WebP/SVG/MP4/WebM/WebVTT assets required by the selected scope.
- App-owned blocks render as semantic escaped HTML with headings, prose marks/formatting, styled lists, Sections, academic containers, evidence, captions/numbering, image layout preferences, page breaks, headers/footers, and interactive local video controls/captions.
- MathLive static conversion emits allowlisted MathML. Failed or unsafe conversion produces escaped source text and a compatibility finding rather than executable or malformed markup.
- CSP denies scripts, connections, objects, frames, fonts, base changes, and forms. Generated asset references are local SHA-256 paths; no CDN, remote URL, original file path, data/blob URL, editor runtime, or service worker is packaged.
- Compatibility findings are now scope-aware: node-bound findings outside selected top-level Sections are excluded from the frozen report.
- The Web dialog shares the established publication shell, remains lazy-loaded, guards empty Section selection, and states explicitly that the ZIP cannot be imported as a Notebook.

## Evidence

- model: 11 focused projection/Web tests pass, including five hashed media assets, interactive WebM/WebVTT reconstruction, malicious author-text escaping, CSP, safe/fallback math, print CSS, Section scope, and invalid-format rejection.
- UI: 2 focused Web dialog cases and 2 adjacent DOCX regression cases pass.
- Chromium: the real export passes at 2400px, 1440px, and 1100px plus 80%, 130%, and forced colors. The downloaded ZIP is parsed in-browser-test code and its HTML/CSS contract is asserted.
- artifact rendering: the real package renders without horizontal overflow at 1100px and 560px and under print media. Screenshots were visually inspected. Inline MathML text received scoped spacing after visual inspection exposed a missing gap around `or`.
- static: incremental TypeScript, focused ESLint, production Vite build, file-size validation, memory validation, and diff hygiene pass.
- resource: no full unit/UI/canary suite ran. Gate-owned processes are stopped; the existing reusable test server remains untouched, and untracked `test-results/` plus unrelated Rust OOE work remain excluded.
