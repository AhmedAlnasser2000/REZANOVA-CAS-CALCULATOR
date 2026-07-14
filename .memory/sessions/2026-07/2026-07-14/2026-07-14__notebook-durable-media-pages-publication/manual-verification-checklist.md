# Notebook Durable Media, Pages, And Publication Manual Verification

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

## What Is Achieved Now

- Notebook documents are durable local library records with autosave, recovery, bounded version history, Trash, and lossless `.cwiznb` import/export.
- The ribbon has File, Home, Insert, Layout, Picture Format, and Video Format ownership with one Tiptap selection/undo history.
- V9 supports safe PNG/JPEG/static WebP/static SVG images, Print/Draft pages, and local MP4/WebM video with poster and WebVTT captions.
- PDF, DOCX, and self-contained Web ZIP publication are live over frozen app-owned projections. Only `.cwiznb` is re-importable without loss.
- Normal live authoring is verified at 5,000 text-heavy blocks with 2,000 inline-math nodes; oversized imports remain untruncated in Draft view.

## Manual App Steps

1. Create a Notebook from the Worked Example template, edit its title and prose, wait for `Saved locally`, close its tab, and reopen it from File > Open.
2. Insert a safe raster image and safe static SVG. Set alt text or Decorative, add a caption, then change width, alignment, wrapping, crop, and rotation in Picture Format.
3. Switch to Layout. Change paper, orientation, margins, header/footer, numbering, and add a page break; toggle Print and Draft views.
4. Insert a local MP4 or WebM, add title/description/caption, poster, and a valid WebVTT track; play, seek, switch to another workspace, and return.
5. Export `.cwiznb`, import it, and confirm the imported copy has a new library identity while retaining content and assets.
6. Open File and exercise Print/Save as PDF for whole document, page range, and selected Sections where applicable.
7. Export Word `.docx`, open it in LibreOffice and Microsoft 365 Word when available, and inspect editable text/lists/equations, images, running matter, structured blocks, and static video substitutions.
8. Export the Web ZIP, extract it, open `index.html` through a local static server, resize to desktop/mobile widths, print-preview it, and play local video with captions.
9. Keep the Notebook open beside a solver workspace, switch repeatedly, and verify inactive video pauses while solver interaction remains responsive.

## Expected Results

- Reopened and imported Notebooks retain app-owned structure and assets; closing a tab never deletes the library document.
- Images/videos remain content-addressed and no original local path appears in the document or publication.
- Page controls change derived layout without creating one editor per page; Draft remains continuous and Print shows stable page numbering.
- Video controls are visible, seeking works, WebVTT captions load, and inactive-tab eviction releases playback resources.
- PDF uses the system print flow; DOCX is editable best-effort output with compatibility warnings; Web ZIP is responsive, printable, offline, and interactive for local video.
- PDF, DOCX, and Web are never offered as Notebook imports. `.cwiznb` is the only lossless round-trip format.
- No export mutates save state, document history, Workspace Tabs, History, solver state, or OOE ownership.

## Outstanding Manual Evidence

- Microsoft 365 Word smoke remains required before claiming non-provisional Word compatibility. LibreOffice 26.2.2.2 rendering is already verified.
