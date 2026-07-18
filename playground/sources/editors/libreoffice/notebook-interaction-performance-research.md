# Notebook interaction and performance lessons from LibreOffice Writer

Date: 2026-07-17

Source context:

- Upstream: <https://github.com/LibreOffice/core>
- Local mirror: `playground/sources/editors/libreoffice/mirror/core/`
- Captured commit: `ac64d1a9eb11541009b43a2c4c2647cebe4a9e19`
- Inspection mode: static source read only; no build, execution, dependency use, code copy, or asset copy.

## Scope

This note is not only about image resizing or export. It compares the whole
Calcwiz Notebook interaction model against LibreOffice Writer/SVX source
patterns that make object editing feel stable: handles, dragging, anchoring,
wrapping, pagination/layout, and save/export flow.

## What LibreOffice has structurally

LibreOffice does not treat image/object manipulation as ordinary document
content re-rendered on every pointer movement.

- `include/svx/svdhdl.hxx` defines explicit handle kinds and overlay-backed
  handle objects. The model includes move, eight resize handles, anchor handles,
  crop handles, and rotation/shear mode support.
- `include/svx/svddrag.hxx` defines `SdrDragStat`, a view-owned drag state. It
  stores pointer geometry, action rectangles, thresholds, axis locking, and
  whether the final drag changes attributes, geometry, or layout. This keeps
  transient pointer work out of the persistent document model until the drag
  ends.
- `svx/source/svdraw/svdhdl.cxx` renders and hit-tests handles through overlay
  objects rather than through the document layout boxes themselves.
- `sw/source/core/inc/anchoredobjectposition.hxx` and
  `sw/source/core/objectpositioning/anchoredobjectposition.cxx` make anchored
  object positioning a dedicated layout concern with anchor frames, page/frame
  references, follow-text-flow behavior, and capture rules.
- `sw/source/core/layout/objectformatter.cxx` separates formatting of floating
  screen objects from ordinary text flow.
- `sw/source/core/layout/sortedobjs.cxx` gives anchored objects explicit ordering
  by anchor type, content position, wrapping mode, layer, and order value.
- `sw/source/ui/frmdlg/wrap.cxx` exposes richer wrap behavior than a simple
  segmented drop target: none, left, right, parallel, through, dynamic, contour,
  outside, anchor-only, overlap, and margin distances.
- `sfx2/source/doc/guisaveas.cxx` and `sfx2/source/dialog/filedlghelper.cxx`
  route save/export through a file dialog and filter context before the store
  operation, including Writer export/save-as contexts and last-filter handling.

The pattern is old-school C++ and heavy, but the architectural shape matters:
there is a separate view interaction plane, a separate layout/anchoring plane,
and a separate store/export dialog pipeline.

## What Calcwiz Notebook currently does in hot paths

The current Notebook is feature-rich, but too much work is coupled to editor
updates, React state, and live DOM layout reads.

- `NotebookRichCanvas.tsx` calls `editor.getJSON()` and
  `notebookDocumentFromTiptap(...)` inside `flushDocumentSync`. For smaller
  documents, `onUpdate` calls that synchronously, then also refreshes inspector
  selection, prose selection, revision state, and selected media status.
- `useNotebookPagination.tsx` walks `editorElement.children`, reads
  `getBoundingClientRect()`/`getComputedStyle()`, calculates pagination/floating
  fragments, writes CSS variables and inline style properties, then updates
  React metrics. This is valid layout work, but expensive when it happens too
  close to typing, selection, drag, resize, or scroll churn.
- `NotebookDirectMediaInteraction.ts` now has a better `requestAnimationFrame`
  pointer loop, but resize/crop/rotate previews still pass through React
  preview state and emit interaction events during the gesture. It is not yet a
  fully isolated overlay plane.
- `NotebookDirectMediaCanvasCoordinator.ts` still decides flow wrap targets with
  one-third horizontal zones: left wrap, normal, right wrap. That is why the
  interaction feels unlike a document editor with continuous guides/anchors.
- `NotebookWebExportDialog.tsx` builds the Web package before invoking the save
  port. `buildNotebookWebPackage(...)` reads all assets into arrays and runs
  `JSZip.generateAsync(...)` in the renderer-side flow, so the app can appear
  stuck before the user even sees where the file will be saved.

## Why the Notebook feels slow and laggy

The current lag is not only dev-mode overhead. Running from source can add Vite
and debug overhead, but the source shows real architectural pressure:

1. Pointer interaction is still too close to React/Tiptap state.
2. Pagination is DOM-measured and broad, not dirty-range/incremental enough.
3. Editor updates can serialize the full Tiptap document into the app document
   immediately for small/medium documents.
4. Selection, inspector, prose toolbar state, media status, and pagination can
   all react to the same editing gesture.
5. Export preparation can run heavy ZIP generation before destination selection.
6. The current wrap UI is segmented, not continuous, so object placement feels
   mechanical even when it technically works.

## Practical remediation direction

The clean path is not another local patch to image resizing. It is a Notebook
interaction-performance lane:

1. Add a Notebook interaction plane for handles, guides, drag ghosts,
   coordinates, and transient media/object previews. It should be mostly
   imperative/overlay-owned and should not require React tree re-rendering for
   every pointer move.
2. During a gesture, preview only in that plane. Commit exactly one ProseMirror
   transaction/document mutation on release; Escape cancels without document
   churn.
3. Make pagination incremental and scheduled. Cache measured node geometry,
   invalidate only dirty ranges where possible, and prevent pagination from
   running during every transient object preview.
4. Split `onUpdate` responsibilities: typing should not always force full
   `getJSON()` conversion, inspector refresh, prose-toolbar refresh, media
   status refresh, and pagination in the same interactive frame.
5. Replace segmented wrap targets with continuous guides plus explicit object
   controls: anchor, wrap mode, distance, layer, coordinates, and return-to-flow.
6. Open the native/browser save destination first for DOCX/Web/.cwiznb/recovery
   exports, then generate/write with cancellable progress. Long package
   generation should move off the active renderer path where possible.
7. Add probes before more feature work: rAF frame time during typing/drag,
   pagination duration, document-sync duration, serialization size/time, export
   package phases, and inspector/update churn.

## What not to copy

Do not copy LibreOffice code or adopt LibreOffice as a dependency. The useful
lesson is architectural: view-owned interaction state, dedicated anchored-object
layout, explicit wrapping/layering semantics, and a save/export flow that asks
for destination before expensive package generation.
