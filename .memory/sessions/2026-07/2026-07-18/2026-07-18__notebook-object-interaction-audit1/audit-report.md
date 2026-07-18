# NOTEBOOK-OBJECT-INTERACTION-AUDIT1

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.6
- primary_agent_family: sol
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.6
- recorded_by_agent_family: sol
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.6
- verified_by_agent_family: sol
- attribution_basis: live
- gate_type: ui
- date: 2026-07-18

## Outcome

The current Notebook image/object interaction implementation should not be extended as the foundation for the next object-authoring program. It has useful durable data and safety work, but its live interaction authority is fragmented across incompatible sizing, placement, rendering, and pagination paths.

The next program should preserve current documents and the sound ingestion/persistence/publication contracts, introduce one object geometry and interaction authority, migrate current Schema 14 documents losslessly, then delete the replaced runtime paths. There must not be two live interaction systems or retained zombie code.

This audit changes no runtime behavior.

## Scope

Audited:

- image insertion, geometry, resize, crop, rotation, drag, flow placement, and floating placement;
- image NodeView rendering and selection chrome;
- floating object pagination, anchor, wrap, and layer behavior;
- Objects & Layers selection and ordering;
- editor update and pagination hot paths;
- Web/DOCX export preparation and destination ordering;
- current image asset/persistence/schema boundaries;
- the local LibreOffice Writer/SVX source research at captured commit `ac64d1a9eb11541009b43a2c4c2647cebe4a9e19`.

Not audited as an implementation target:

- video, which remains removed from current Schema 14;
- unrelated Equation, Calculus, Linear Algebra, Statistics, OOE, result-contract, or app-state work;
- visual restyling unrelated to object interaction;
- importing or copying LibreOffice code.

## Current Authority Map

### Durable document data

`NotebookImageNode` currently exposes all of the following at once:

- legacy percentage width: `widthPercent`;
- point dimensions: `displayWidthPt` and `displayHeightPt`;
- legacy flow alignment and placement: `alignment` and `placement`;
- a separate aspect ratio: `displayAspectRatio`;
- rotation and crop;
- generic `objectPlacement`, whose floating branch contains another `widthPt`.

Evidence: `src/lib/notebook/document/types.ts:152-167` and `src/lib/notebook/document/types.ts:261-277`.

The same overlapping fields are accepted by the current model validator, Tiptap adapter, and image extension attributes. Consequently, a floating image can carry two persisted widths and an independent ratio while also retaining the old percentage and flow-placement vocabulary.

### Live image interaction

Live gesture authority is split between:

- `NotebookImageNodeView.tsx`, which loads the asset, measures editor width, owns crop-mode state, renders the image and all resize/crop/rotation handles, and performs keyboard geometry changes;
- `NotebookDirectMediaInteraction.ts`, which measures the frame, calculates resize/crop/rotation previews, converts between CSS pixels, percentages, points, and ratios, and commits NodeView attribute updates;
- `NotebookDirectMediaCanvasCoordinator.ts`, which separately owns image drag/reorder/floating conversion, autoscroll, ghost overlays, insertion guides, and legacy wrap drops;
- `NotebookPictureFormatControls.tsx`, which can independently write percentage width, point width/height, alignment, placement, crop, rotation, and aspect-ratio reset attributes;
- `notebook-rich-canvas.css`, which contains both legacy percent/float image layout and generic absolute floating-object layout;
- `useNotebookPagination.tsx`, which measures live DOM, writes object positions and widths back into the presentation DOM, and can return oversized objects to flow.

This is not one command path with several views. It is several mutation and presentation paths sharing partly overlapping attributes.

### Floating layout

The pure document paginator contains useful page-policy logic, but its browser integration is broad and mutation-heavy:

- `useNotebookPagination.tsx` walks every top-level editor child and all object nodes;
- it reads `getBoundingClientRect()` and `getComputedStyle()` broadly;
- `notebook-pagination-dom.ts` temporarily writes width/max-width/box-sizing to live object elements to measure them;
- it clears and rewrites data attributes, CSS variables, inline styles, and a generated stylesheet;
- it reruns from a React `revision` that is incremented for both document updates and selection-only updates.

Evidence: `src/app/shell/notebook/canvas/NotebookRichCanvas.tsx:108-109`, `:265-291`, `:316-325`; `src/app/shell/notebook/canvas/notebook-pagination-dom.ts:99-164`; and `src/app/shell/notebook/canvas/useNotebookPagination.tsx:184-408`.

### Objects & Layers

`NotebookObjectLayers.tsx` is a useful first UI surface but is not an object-selection authority. It:

- lists only objects already persisted as floating;
- selects by node ID;
- exposes four z-order commands;
- has no visibility state, lock state, page grouping, overlapping-object cycling, anchor editing, or behind-text recovery interaction.

No Alt-click overlapping-object cycle exists in the audited Notebook source.

### Export

The destination-save port is sound in isolation: desktop uses the Tauri save command sequence and browser uses the File System Access API where available. The ordering above it is wrong for expensive exports:

- Web export calls `buildNotebookWebPackage()` before `savePort.save()`;
- package generation reads every asset blob into arrays and runs `JSZip.generateAsync()` in the renderer;
- the destination picker therefore appears only after expensive package generation completes.

Evidence: `src/app/shell/notebook/publication/NotebookWebExportDialog.tsx:81-94` and `src/lib/notebook/publication/web.ts:364-407`.

This matches the observed “not responding” state and the user not seeing where the export will be saved. Development mode can add overhead, but it is not the architectural cause.

## Findings

### F1 — Critical: persisted image geometry has multiple authorities

`widthPercent`, `displayWidthPt`, `displayHeightPt`, `displayAspectRatio`, and floating `objectPlacement.widthPt` can all describe the same visible image. Legacy flow placement and generic floating placement also coexist.

Impact:

- one path can resize the image while another retains a stale selection/layout width;
- conversions depend on current editor width and UI scale;
- flow, floating, print, Web, and DOCX can choose different fields;
- fixes tend to patch a symptom rather than remove the conflicting source.

Required response: introduce one current object-frame geometry authority and make old fields migration-only inputs. Do not add another compatibility field to the live authoring model.

### F2 — Critical: selection chrome is embedded in document content

The image NodeView renders the selected outline, eight resize handles, rotation handle, crop overlay, crop handles, and drag grip around the image itself. The gesture hook then drives React state for transient preview.

Impact:

- content box, selection box, and interaction box can diverge;
- React/Tiptap rendering participates in pointer movement;
- crop, rotation, caption, and flow layout can affect the box used by handles;
- every new object type encourages another specialized NodeView interaction implementation.

Required response: NodeViews render editable document content only. One Notebook-owned overlay/interaction plane renders selection, handles, guides, anchors, coordinates, and drag previews from one measured rectangle.

### F3 — Critical: pointer ownership is split

Resize/crop/rotation are handled by `NotebookDirectMediaInteraction.ts`; drag/reorder/wrap/floating are handled by `NotebookDirectMediaCanvasCoordinator.ts`; ribbon fields write attributes independently; keyboard changes are handled again in the NodeView.

Impact:

- cancellation, undo grouping, pointer capture, preview, selection, and mutation rules are duplicated;
- a drag may cross from one authority into another;
- the code cannot guarantee that the previewed rectangle is the committed rectangle.

Required response: one interaction session owns pointer capture, initial geometry, current preview, snapping, autoscroll, cancellation, and release. It calls one document command on release and no document transaction during movement.

### F4 — High: the existing wrap interaction is explicitly segmented

`NotebookDirectMediaCanvasCoordinator.ts` constructs four targets—Wrap left, Normal flow, Wrap right, Float here—and derives left/normal/right from horizontal thirds.

Impact:

- movement feels mechanical and discontinuous;
- image position and wrap semantics are conflated;
- the user cannot place an object continuously and then choose wrap/anchor/layer deliberately.

Required response: remove the segmented drop surface. Use continuous pointer-following placement with insertion guides for return-to-flow, plus a selected-object overlay menu for Wrap, Anchor, and Layer.

### F5 — High: pagination is coupled to selection and broad DOM mutation

Selection-only changes increment the same `revision` that schedules pagination. Pagination then measures broad DOM ranges and rewrites presentation state for the whole stage.

Impact:

- selection, typing, object movement, inspector updates, and pagination compete in the same interactive frames;
- measurement and mutation can force repeated layout;
- large documents pay work unrelated to the changed range.

Required response: separate document revision from selection revision; cache object/block measurements; invalidate dirty ranges; suspend pagination during transient object gestures; apply derived layout in one scheduled write phase.

### F6 — High: document synchronization fans out on normal editor updates

For documents up to node size 150,000, `onUpdate` synchronously converts full Tiptap JSON into the app-owned document, then refreshes inspector selection, contextual selection, prose toolbar state, pagination revision, and selected-media status.

Impact:

- normal typing bears serialization and several unrelated UI updates;
- object gestures can trigger work beyond the selected object;
- source-build slowness can amplify the problem but does not create it.

Required response: schedule persistence serialization outside the interactive frame, update contextual consumers only when their relevant state changes, and use transaction metadata/dirty ranges to decide pagination and inspector work.

### F7 — High: Objects & Layers is a list, not yet a selection substrate

The current panel cannot reliably recover a behind-text object, cycle overlaps, temporarily hide an object while editing, lock position, or show meaningful anchor/page context.

Required response: make the panel and Alt-click cycling clients of the same object registry/hit-test authority used by the canvas overlay. “Hide while editing” must remain session-only and must not change export visibility.

### F8 — High: expensive export work happens before destination selection

The current Web export generates the ZIP before invoking the save port. The same architectural ordering should be audited for every byte-producing export.

Required response: choose destination first, then generate and write with progress/cancellation off the active renderer path where practical. Cancel before generation must write nothing.

### F9 — Medium: authority is concentrated in near-cap files

The principal audited files total 8,221 lines. Three production files are almost exactly at the 1,000-line cap:

- `NotebookDirectMediaInteraction.ts`: 964 lines;
- `NotebookDirectMediaCanvasCoordinator.ts`: 990 lines;
- `NotebookRichCanvas.tsx`: 965 lines.

The issue is not line count alone. Each file crosses geometry, view state, editor mutation, layout, or lifecycle boundaries. The replacement should split by authority, not merely move functions into smaller files.

## LibreOffice Source Lesson

The local static LibreOffice source mirror confirms a stable architectural separation:

- explicit handle kinds and overlay-owned handles in `include/svx/svdhdl.hxx`;
- view-owned drag state in `include/svx/svddrag.hxx`;
- anchored-object positioning as a layout concern in `sw/source/core/inc/anchoredobjectposition.hxx`;
- explicit anchored-object ordering in `sw/source/core/layout/sortedobjs.cxx`;
- wrap semantics as object properties in `sw/source/ui/frmdlg/wrap.cxx`;
- Save As context and file-dialog selection before storage in `sfx2/source/doc/guisaveas.cxx`.

Calcwiz should learn from the separation, not copy LibreOffice code or its full feature breadth.

## Preserve, Replace, Delete

### Preserve as current product capability

- PNG, JPEG, static WebP, and safe static SVG ingestion and rejection policy;
- content-addressed asset IDs, atomic storage, package validation, history, Trash, recovery, and `.cwiznb` reconstruction;
- intrinsic `imageWidthPx`/`imageHeightPx` asset metadata;
- immediate insertion without a forced caption dialog;
- optional alt/decorative state, caption, and Figure numbering;
- stable node IDs and the current schema compatibility boundary;
- one-editor/one-selection/one-undo model;
- current document move commands and semantic Outline ownership;
- the pure page-policy concepts already tested: page/paragraph anchors, wrap exclusions, fixed pages, header/footer exclusion, oversized structured-object return-to-flow, and explicit z-order;
- PDF/DOCX/Web as publication projections and `.cwiznb` as the only lossless interchange format.

### Preserve only as migration input or behavioral reference

- `widthPercent`;
- legacy image `alignment` and `placement`;
- `displayAspectRatio` when it merely duplicates point dimensions;
- floating `objectPlacement.widthPt` when image point dimensions already describe the same frame;
- current gesture/pagination tests whose expected product behavior remains correct.

These must not remain competing live authoring authorities.

### Replace

- image NodeView interaction chrome with one external overlay plane;
- `NotebookDirectMediaInteraction.ts` with a view-owned interaction session and pure geometry kernel;
- image/structured drag portions of `NotebookDirectMediaCanvasCoordinator.ts` with one object pointer authority;
- segmented wrap targets with continuous placement plus explicit Wrap/Anchor/Layer commands;
- broad revision-driven pagination with dirty-range scheduled layout;
- independently mutating ribbon/keyboard/drag paths with shared object commands;
- Objects & Layers list-only behavior with registry-backed selection, overlap cycling, session visibility, lock, anchor, and z-order controls;
- renderer-blocking export preparation with destination-first cancellable generation.

### Delete after replacement parity is verified

- old NodeView resize/crop/rotation handle markup and its CSS;
- old percentage preset/custom-width runtime authority;
- old legacy float placement CSS and four-segment flow target overlay;
- old image portions of `NotebookDirectMediaCanvasCoordinator.ts`;
- `NotebookDirectMediaInteraction.ts` and obsolete tests tied to its internal model;
- DOM custom events used only to bridge crop state between the toolbar and NodeView;
- duplicate image geometry converters and stale compatibility branches outside the schema migration boundary;
- pagination code that temporarily mutates live object widths for measurement;
- any compatibility adapter retained after all current documents have crossed the new ingress.

Deletion must occur in the same closeout program. “Unused but maybe helpful later” is not an acceptable reason to retain a second authority.

## Target Architecture

### 1. One durable object frame

The next persisted document schema should have one current frame source:

- canonical point width;
- canonical point height for fixed-ratio/fixed-frame objects such as images;
- rotation and source-relative crop where supported;
- flow or floating placement;
- when floating: anchor, references, x/y, wrap, text distances, and z-order.

The placement contract must not carry a second image width. Structured objects may have a frame width with automatic height, but all object types must resolve through one shared frame accessor.

Existing Schema 14 fields must migrate deterministically, preferring valid explicit point dimensions, then intrinsic asset ratio, then legacy percentage resolved against the stored page setup. Old fields remain readable only inside compatibility ingress.

### 2. One view-owned interaction plane

Create one Notebook object overlay above the page/editor surface. It owns:

- selected-object rectangle;
- adaptive resize/crop/rotation handles;
- pointer capture and drag session;
- guides, anchors, coordinates, insertion positions, and snapping;
- Alt-click overlap cycling;
- the compact Wrap / Layer / Anchor menu;
- session-only hidden-object affordances.

Pointer movement updates only overlay transforms/styles at most once per animation frame. React may receive settled selection/session state, but not every pointer coordinate.

### 3. One object command layer

Every entry point—pointer release, keyboard, ribbon field, overlay menu, and Objects & Layers—must call the same commands:

- select/cycle object;
- set frame;
- set crop/rotation;
- set flow/floating placement;
- set anchor/wrap/text distance;
- move layer;
- return to flow;
- lock/unlock position.

Each completed user operation creates exactly one ProseMirror transaction and one undo step. Escape creates none.

### 4. One derived layout plane

Layout consumes document object frames and page geometry. It must:

- never own gesture state;
- never infer a second persistent size from a stale DOM wrapper;
- cache measurements and invalidate only affected blocks/pages;
- avoid running on selection-only changes;
- freeze or defer reflow during transient object manipulation;
- preserve running-matter exclusion and page-anchor rules;
- expose derived rectangles to overlays, status coordinates, print, and publication projections.

### 5. One object registry and selection model

The registry indexes eligible objects by ID, page, anchor, derived rectangle, z-order, visibility-in-editor, and lock state. Canvas hit testing, Alt-click cycling, overlay selection, and Objects & Layers all query it.

“Hide while editing” is session/UI state only: the object still saves and exports normally. “Move with text” means paragraph-anchored; “Fixed on page” means page-anchored. These must be explicit labels rather than a vague combined switch.

### 6. Destination-first export

Export must choose format, scope, and destination before expensive generation. Generation then runs with progress and cancellation. Web ZIP assembly must leave the interactive renderer path when the chosen platform can provide a worker/native implementation without duplicating publication semantics.

## Recommended Forward Gates

1. `NOTEBOOK-OBJECT-INTERACTION-BASELINE1` — UI/performance
   - Add timing probes and deterministic fixtures for typing, selection, image resize, floating drag, pagination, serialization, and export phases.
   - Record current behavior; no new object features.

2. `NOTEBOOK-OBJECT-GEOMETRY-AUTHORITY1` — backend/current schema advance
   - Introduce the single current object frame and deterministic Schema 14 migration.
   - Keep legacy fields inside compatibility ingress only.

3. `NOTEBOOK-IMAGE-INTERACTION-PLANE1` — UI
   - Build the overlay/session/command path for images first.
   - Prove resize, crop, rotation, move, cancellation, keyboard access, and one-step undo.
   - Remove image handles and live gesture state from the NodeView in the same gate.

4. `NOTEBOOK-OBJECT-LAYOUT-ENGINE1` — backend/UI
   - Rebase flow/floating layout on the single frame contract.
   - Add cached dirty-range pagination and derived object rectangles.
   - Remove live width mutation during measurement.

5. `NOTEBOOK-OBJECT-SELECTION-LAYERS1` — UI
   - Connect canvas hit testing, Alt-click cycling, Objects & Layers, behind-text recovery, session hide/show, lock, anchor, wrap, and z-order to one registry and command layer.

6. `NOTEBOOK-EDITOR-HOT-PATH-SPLIT1` — UI/performance
   - Separate typing, persistence serialization, inspector/context updates, selection state, and pagination invalidation.
   - Prove inactive tabs and solver workspaces remain responsive.

7. `NOTEBOOK-EXPORT-DESTINATION-FIRST1` — backend/UI
   - Pick destination before DOCX/Web/portable/recovery byte generation.
   - Add cancellable progress and remove renderer-blocking Web ZIP assembly where feasible.

8. `NOTEBOOK-LEGACY-INTERACTION-REMOVAL1` — closeout
   - Delete the replaced interaction hook, coordinator branches, legacy image layout CSS, segmented targets, duplicated geometry helpers, and obsolete tests.
   - Ratchet against reintroduction and run schema/publication/Playwright/native verification.

Structured equations, evidence, dividers, containers, and Sections should join the substrate only after the image interaction plane and layout engine prove the authority boundaries. They should reuse the same selection/placement/layer commands rather than receive per-node interaction implementations.

## Acceptance Ratchets for the Future Program

- no current authoring path reads or writes `widthPercent`;
- no current image has two persisted frame widths;
- image NodeView contains no resize/crop/rotation handles;
- pointer movement causes no ProseMirror transaction and no per-frame React tree update;
- release preview-to-commit difference is at most 2 CSS pixels;
- each completed operation is one undo step; Escape is zero;
- selection-only changes do not trigger pagination or full-document serialization;
- no four-segment wrap/floating target exists;
- behind-text objects are recoverable through Alt-click and Objects & Layers;
- session-hidden objects still save and export;
- destination selection precedes expensive export generation;
- all supported Schema 14 documents open identically after migration;
- old runtime files and CSS are deleted, not merely unused;
- video remains absent from current authoring, storage, and publication.

## Final Audit Judgment

The Notebook does not need another patch to the current image interaction hook. It needs a controlled replacement of the live object-interaction and layout authorities while retaining the durable content and safety work around them.

The LibreOffice comparison supports the user's proposed direction: a separate view interaction plane, explicit anchored-object layout, explicit ordering/wrapping semantics, and destination-first saving. The appropriate Calcwiz implementation is much smaller than LibreOffice, but it must preserve those boundaries.
