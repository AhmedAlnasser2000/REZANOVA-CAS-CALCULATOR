# Notebook object-frame authority V1

Status: architecture contract; production implementation has not started
Milestone: `NOTEBOOK-OBJECT-FRAME-AUTHORITY-DESIGN1`
Baseline: `a28383ee565fb24a9a6f99dd44097ccf0a83d907` (`NOTEBOOK-OBJECT-INTERACTION-AUDIT1`)
Gate type: backend
Current durable document schema: 14
Required implementation schema: 15

## Purpose

Schema 14 permits several independent descriptions of the same object. An image may carry percentage width, point width and height, aspect ratio, legacy alignment and placement, plus a second floating width. The editor, NodeView, pointer hooks, CSS, paginator, and publication adapters resolve those values differently.

Schema 15 must replace those competing truths with one persisted `NotebookObjectFrameV1`. Compatibility belongs at schema ingress. After migration, authoring, pagination, rendering, and publication read the frame or a derived layout snapshot; none may reinterpret removed Schema 14 fields.

This document defines the contract only. It changes no production behavior.

## Object eligibility and identity

Every current non-video object with stable block identity receives one embedded frame:

- image figure;
- separate/display equation;
- evidence snapshot;
- divider;
- academic container;
- complete Section subtree.

The frame is embedded in the app-owned document node and mirrored as one opaque Tiptap attribute. It is not stored in an external geometry registry. The node `id` remains the durable identity used by selection, anchors, commands, the Objects & Layers projection, pagination fragments, and publication findings.

Paragraphs, headings, lists, list items, inline math, page breaks, and running matter remain flow-only and do not receive object frames. Paragraph IDs may be referenced as anchors but do not become objects.

## Canonical TypeScript shape

```ts
type NotebookObjectFrameV1 = {
  version: 1;
  size: NotebookObjectSizeV1;
  placement: NotebookObjectFramePlacementV1;
  imageTransform?: NotebookImageTransformV1;
};

type NotebookObjectSizeV1 = {
  width:
    | { mode: 'available' }
    | { mode: 'fixed'; valuePt: number };
  height:
    | { mode: 'auto' }
    | { mode: 'intrinsic' }
    | { mode: 'fixed'; valuePt: number };
};

type NotebookObjectFramePlacementV1 =
  | {
      mode: 'flow';
      alignment: 'left' | 'center' | 'right';
      wrap: 'none' | 'top-and-bottom' | 'square';
      textDistancePt: NotebookObjectTextDistancePt;
    }
  | {
      mode: 'floating';
      anchor:
        | { kind: 'paragraph'; nodeId: string }
        | { kind: 'page'; pageNumber: number };
      horizontalReference: 'page' | 'margins';
      verticalReference: 'page' | 'margins';
      xPt: number;
      yPt: number;
      wrap: 'square' | 'top-and-bottom' | 'in-front' | 'behind';
      textDistancePt: NotebookObjectTextDistancePt;
      zOrder: number;
    };

type NotebookObjectTextDistancePt = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

type NotebookImageTransformV1 = {
  rotationDeg: number;
  crop: null | {
    x: number;
    y: number;
    width: number;
    height: number;
  };
};
```

The Rust representation must be structurally equivalent, use tagged enums for every discriminated union, reject unknown fields, and consume the same golden fixtures.

## Frame invariants

### General

- The frame is required on every eligible Schema 15 node and forbidden on ineligible nodes.
- `version` is exactly `1`.
- All point values are finite decimal numbers. Stored command results are normalized to 0.001 point.
- Fixed width and height are each between 36 and 2,000 points inclusive.
- Text distances are each between 0 and 288 points inclusive.
- Page numbers are integers from 1 through the existing Notebook page-number ceiling.
- Floating `zOrder` values are unique and normalized to `0..N-1` across the document.
- A paragraph anchor must resolve to a surviving paragraph outside the anchored structured object's own subtree.
- Unknown keys or invalid type/size/placement combinations fail strict current-schema validation.

### Size by object kind

- Image: width is always fixed. Height is either fixed or intrinsic. `auto` and available width are invalid.
- Image with fixed height: deliberate distortion is represented directly by width and height. No separate display aspect ratio is stored.
- Image with intrinsic height: rendered height is `width / intrinsicAspectRatio`, where the ratio comes only from the resolved asset metadata or safe decode result.
- Display equation, evidence, divider, academic container, and Section: height is always auto.
- A flow structured object may use available width or fixed width.
- A floating object always uses fixed width. Available width is invalid in floating mode.
- No object has two widths or two heights.

### Placement

- Flow position is the node's document-tree position. The frame does not store X/Y or layer order for flow objects.
- Flow `none` means ordinary block flow. `top-and-bottom` preserves an explicit no-side-text wrap intent. `square` permits side text and requires left or right alignment; center plus square is invalid.
- Floating X/Y are offsets in canonical page points from the selected horizontal and vertical reference rectangles.
- Floating placement never stores a second width; it uses `size.width.valuePt`.
- Page anchors remain assigned to their physical page. Paragraph anchors follow the paragraph to its derived page.
- Front and behind wrapping reserve no flow space. Square and top-and-bottom produce derived exclusions using transformed bounds plus text distance.
- Body and margins are permitted placement areas. Editable header and footer bands are excluded by derived layout.
- An object's semantic tree position remains stable while it floats. Returning to flow reveals that position; an insertion-guide drop may move the node and return it to flow in the same command.

### Image transform

- `imageTransform` is required only on images and forbidden on other object kinds.
- Rotation is normalized to the half-open range `[0, 360)` and stored to 0.001 degree. UI commands may snap without narrowing the persisted contract to snapped angles.
- Crop uses source-relative normalized coordinates. Each value is finite, the rectangle lies inside `[0,1] x [0,1]`, and at least 10% of source width and height remain visible.
- Crop changes visible source content inside the frame; it does not create another outer width or height.
- Rotation is around the frame center.
- For outer width `w`, height `h`, and angle `theta`, transformed bounds are derived as:
  - `boundsWidth = abs(w*cos(theta)) + abs(h*sin(theta))`
  - `boundsHeight = abs(w*sin(theta)) + abs(h*cos(theta))`
- Pagination, hit testing, snapping, and PDF placement use the transformed bounds. The persisted width and height remain the unrotated frame box.

## Persisted versus derived data

### Persisted in Schema 15

- stable node ID and semantic node content;
- exactly one object frame;
- one discriminated width/height policy;
- flow alignment/wrap intent, or floating anchor/reference/X/Y/wrap/z-order;
- text distances;
- image crop and rotation;
- asset ID and per-use image accessibility/caption semantics on the image node.

### Always derived

- rendered CSS pixels and zoom-scaled dimensions;
- width or height percentages;
- intrinsic aspect ratio;
- effective height for intrinsic images or auto-height content;
- effective width after page containment;
- transformed bounding box;
- viewport, page-local, Draft, and scroll-local rectangles;
- handle, rotation control, anchor glyph, and guide coordinates;
- drag ghost and resize/crop/rotate preview rectangles;
- page numbers for paragraph-anchored objects;
- wrap exclusions and collision rectangles;
- narrow-screen fallback placement;
- PDF pixels, DOCX EMUs, and Web CSS units.

Derived containment may display a clamped or proportionally fitted rectangle when a legacy frame, a changed page setup, or auto-height content cannot fit. Measurement alone must not write the derived rectangle back. An author command may explicitly accept or change the canonical frame.

## Intrinsic asset metadata and semantic metadata

Immutable asset metadata owns:

- content hash and asset ID;
- MIME type;
- byte length;
- intrinsic pixel width and height when available;
- intrinsic aspect ratio derived from those dimensions;
- safe-decode and package-validation facts.

Alt text, Decorative, caption text, and automatic caption numbering do **not** belong to immutable content-addressed asset metadata. They are per-use semantic properties of the image node because one asset may have different meaning in different document locations. They remain outside the object frame because they are content/accessibility semantics, not geometry.

If an old image lacks intrinsic dimensions, the asset layer may persist dimensions obtained from a safe decode into the asset record without mutating Notebook history. Missing or undecodable assets render an unavailable placeholder using the canonical frame width and a bounded fallback height; they do not invent durable geometry.

## Interaction plane

The interaction plane is a view-owned overlay keyed by node ID. It owns only transient state:

- current object selection and alternate-selection cycle;
- pointer capture and active gesture;
- resize, crop, rotation, and anchor handles;
- drag ghost, insertion guide, snap guide, and anchor glyph;
- latest pointer sample and one requestAnimationFrame preview;
- hit-test stack and preview rectangle;
- focus restoration and live announcements;
- session-only hidden-while-editing and interaction-locked ID sets.

The plane reads the selected node's frame and the current immutable layout snapshot. It never stores durable geometry, edits Tiptap on pointer move, serializes the document, triggers pagination, or starts autosave. On pointer release it submits one typed command containing the original frame, final proposed frame, and object ID. Escape discards the preview.

The image NodeView becomes a passive content renderer and asset-state surface. It does not own selected outlines, handles, gesture state, global listeners, crop events, or direct attribute mutations.

## Command path and undo

One Notebook object-command module is the only authoring mutation authority for:

- resize;
- move or keyboard nudge;
- align;
- wrap change;
- float and unfloat;
- rotate;
- crop or reset crop;
- layer changes;
- flow reorder;
- explicit point-size changes;
- keyboard resize.

Each command:

1. locates the stable node ID;
2. validates object kind and command eligibility;
3. computes one normalized next frame;
4. repairs anchors or normalizes all floating z-orders when required;
5. applies related document moves in the same transaction;
6. dispatches exactly one Tiptap transaction;
7. creates one undo entry and one document revision;
8. permits the normal settled autosave to run once.

No command directly writes CSS, page fragments, registry geometry, publication state, or asset metadata. Picture Format, the overlay menu, Objects & Layers, Inspector controls, and keyboard actions all call this same module.

## Derived layout plane

`NotebookObjectLayoutService` is a pure or cache-backed derived service. Its inputs are:

- current app-owned document and object frames;
- page setup and running-matter bands;
- immutable asset metadata;
- view mode and scale;
- cached intrinsic/content measurements keyed by node ID and content revision.

It returns an immutable `NotebookObjectLayoutSnapshotV1` containing:

- flow and physical-page fragments;
- object content rectangles and transformed bounds in canonical points;
- page/viewport pixel projections;
- wrap exclusions;
- hit boxes and z-ordered hit stacks;
- anchor glyph positions;
- Draft placeholders;
- fit/clamp/fallback findings;
- auto-height structured objects that must be offered a return-to-flow command.

Content measurement is an input fact, not stored geometry. ResizeObserver-style targeted measurement may update a measurement revision, but selection changes alone do not trigger full-document measurement or pagination. The layout service never calls editor commands and never serializes the document.

Revision separation is mandatory:

- document revision: semantic content or frame transaction;
- layout revision: page setup, content measurement, asset metadata, or document revision affecting layout;
- selection revision: active editor or object selection only;
- interaction revision: transient requestAnimationFrame preview only.

## Pagination policy

- Flow objects paginate at their tree position using derived size. Existing keep-with-next, page-break, and structured split policies remain.
- Images move intact when possible and proportionally fit derived output if their transformed bounds exceed the usable sheet.
- Floating paragraph anchors resolve to the page containing the anchor's flow fragment. Page anchors preserve their numbered page, including necessary blank pages.
- Deleting an anchor repairs it in the same document transaction to the nearest preceding paragraph, then following paragraph, then current page.
- Rotated bounds, crop viewport, wrap distance, margins, and running-matter exclusion are calculated from the frame; editor DOM geometry is not authority.
- Page setup changes preserve point geometry. The page-setup command also clamps fixed-size objects that can be resolved without content measurement; auto-height overflow is a derived finding and may prompt a single return-to-flow command.
- Structured frames that become taller than the usable body return to flow only through one explicit, undoable command. The layout service does not silently mutate them.
- Draft represents page-anchored floating objects as deterministic ordered placeholders with page and anchor badges. Direct X/Y manipulation switches to Print Layout.
- Narrow screens preserve document truth but may use a derived, labelled flow fallback. They never rewrite the frame.

## Objects & Layers registry

The registry is a view projection, not a second document model. It is rebuilt incrementally from document nodes plus the layout snapshot and keyed only by stable node ID.

It may expose type, label, page, anchor, wrap, z-order, derived rectangle, selected state, and authoring-only hidden/locked state. It stores no width, height, X/Y, crop, rotation, or wrap authority.

- It lists both flow and floating eligible objects.
- Selection is session/editor state and does not change document content.
- Alt-click asks the layout snapshot for the z-ordered objects under the point and cycles a session-only index.
- Layer commands update frame z-order through the command module and normalize the full stack in one transaction.
- Hide while editing is session-only; hidden objects still save, print, and export.
- Interaction lock is session-only in V1; it blocks pointer manipulation but not explicit unlock or keyboard-accessible selection.
- Panel group collapse and search/filter state are local UI state.
- Permanent document visibility and persisted object locking are not part of V1.

## Publication contract

The required order is:

```text
Schema 15 document + object frames + assets + page setup
  -> immutable Notebook publication projection
  -> destination adapter
```

The editor DOM and interaction overlay are forbidden publication inputs.

- `.cwiznb`: stores Schema 15 content and assets losslessly. It is the only round-trip format.
- PDF/print: consumes authoritative page-layout fragments and reproduces point geometry, transformed bounds, layer order, wrap exclusions, captions, and vectors where supported.
- DOCX: converts fixed sizes and floating positions to OOXML units. Images use DrawingML anchors when representable. Structured floating content uses editable anchored structures/text boxes only when semantics are safe; otherwise it emits an explicit visual or flow fallback and compatibility finding.
- Web: wide/print output may consume page-faithful coordinates. Responsive narrow output uses ordered-flow fallback for floating objects and emits a compatibility finding. No object URL or editor runtime escapes.

Destination-specific unit conversion and degradation occur inside the destination adapter. Every fallback appears in the compatibility report before generation.

Export UI must choose destination, scope, presentation choices, and save location before expensive package generation. Cancellation writes nothing and performs no publication work beyond lightweight preflight.

## Schema 14 to Schema 15 migration

Schema 15 is required because removal of fields and addition of the frame changes persisted document meaning. Migration is deterministic in both TypeScript and Rust and occurs only at compatibility ingress.

### Image size precedence

For an image, derive the canonical width as follows:

1. If legacy `objectPlacement.mode` is floating, use its `widthPt` because current floating page layout and print CSS use that visible width.
2. Otherwise use valid `displayWidthPt`.
3. Otherwise convert `widthPercent` against `notebookPageGeometry(pageSetup).usableWidth`.
4. Otherwise use 100% of usable page width.

Clamp the migration result only to the Schema 15 fixed-size validation range and record a repair if clamping was necessary.

Derive height as follows:

1. Use valid `displayHeightPt` exactly. This preserves deliberate side-handle distortion and current floating behavior when floating width differs from legacy point width.
2. Otherwise, if valid `displayAspectRatio` exists, store fixed height `canonicalWidth / displayAspectRatio`.
3. Otherwise store intrinsic height mode; the asset record supplies the ratio later.

When point width, point height, and aspect ratio disagree, visible point dimensions win and the redundant aspect ratio is discarded with a migration finding. For floating images, floating width wins over point width, but point height remains the visible height when present.

### Image flow placement

- missing or `{mode:'flow'}` object placement remains flow;
- `alignment` defaults to center;
- legacy `normal` maps to flow wrap `none`;
- `top-and-bottom` maps to flow wrap `top-and-bottom`;
- `square-left` maps to square plus left alignment;
- `square-right` maps to square plus right alignment;
- legacy flow text distance is zero except the current 18 CSS-pixel square-wrap gap, which maps to 13.5 points on the adjacent side to preserve the 96-DPI editor appearance.

Rotation maps to `rotationDeg`, defaulting to zero. A complete legacy crop maps directly; absence maps to null.

### Floating placement

- Anchor, horizontal/vertical references, X/Y, wrap, text distance, and z-order map directly.
- Legacy floating width moves into `size.width.valuePt` and is removed from placement.
- Image height follows the image precedence above.
- Non-image floating objects use fixed legacy floating width plus auto height.
- Non-image flow objects use available width plus auto height.
- Existing graph validation and normalized z-order rules remain.

### Conflict and repair policy

Valid Schema 14 documents may contain redundant but contradictory image fields. The precedence rules above resolve them. Structurally invalid Schema 14 documents are not silently repaired into current documents; they remain eligible only for raw diagnostic recovery.

Migration returns an internal sidecar report:

```ts
type NotebookObjectFrameMigrationReportV1 = {
  sourceSchema: 14;
  targetSchema: 15;
  repairs: Array<{
    nodeId: string;
    code: string;
    sourceFields: string[];
    resolution: string;
  }>;
};
```

The report is not document content. Desktop/browser open, package import, and version restore may surface it as compatibility evidence. The existing raw `before-schema-upgrade` snapshot preserves the original durable record before the first Schema 15 save. Import leaves the source package untouched.

After migration and validation:

- `widthPercent`, `displayWidthPt`, `displayHeightPt`, `displayAspectRatio`, legacy image `alignment`, legacy image `placement`, `rotation`, `crop`, and `objectPlacement` are absent from current public node types;
- current Tiptap nodes expose only `notebookObjectFrame` for geometry/placement;
- saved Schema 15 documents never emit removed fields;
- TypeScript and Rust must produce byte-equivalent normalized fixture JSON and equivalent repair codes.

## Performance contract

During pointer movement the only permitted path is:

```text
pointer event
  -> update latest transient pointer sample
  -> schedule one requestAnimationFrame
  -> calculate preview from starting frame and immutable layout snapshot
  -> update overlay transform/style
```

Forbidden during preview:

- Tiptap transaction or document command;
- `editor.getJSON()` or app-document serialization;
- React state update per pointer event;
- pagination or full DOM measurement;
- autosave/version snapshot;
- publication work;
- asset hashing or decode;
- broad selection/Inspector recomputation.

On release, one final command creates one transaction and one document revision. Layout recomputes once and settled autosave follows normally.

## Accessibility contract

Every pointer operation has an equivalent:

- focusable selection and resize handles;
- Arrow nudge by 1 point and Shift+Arrow by 10 points;
- keyboard resize with named anchored edge/corner behavior;
- explicit width and height point fields;
- reset to intrinsic proportions;
- align, wrap, float/unfloat, anchor, and layer commands;
- move before/after and insertion-guide alternatives;
- live announcements for position, size, rotation, crop, wrap, anchor, and layer changes;
- deterministic focus restoration after a command or Escape.

Keyboard commands use the same object-command module and create the same single undo entry as pointer commands. Global shortcuts must not intercept body editing or image caption editing.

## Verification contract

Later implementation cannot close without all of the following:

- shared Schema 14 -> 15 golden fixtures in TypeScript and Rust;
- old records, snapshots, Trash, recovery, and `.cwiznb` opening without semantic loss;
- exact frame/Tiptap/storage/package round trips;
- conflict-precedence and repair-report tests;
- no current-schema legacy geometry keys;
- no document mutation, serialization, pagination, or autosave during preview;
- one command, one Tiptap transaction, one undo, and one settled autosave per completed action;
- edge/corner anchor invariants and crop/rotation transformed-bound tests;
- handle error at most 2 CSS pixels, pointer separation at most 3 pixels, release difference at most 2 pixels;
- 80%, 100%, and 130% scale evidence in Print and Draft;
- page-size, orientation, margin, header/footer-band, anchor repair, and oversized-structure evidence;
- registry, Alt-click cycling, behind-text selection, layer normalization, hide-while-editing, and lock evidence;
- PDF point-geometry evidence, DOCX compatibility report and Word/LibreOffice smoke, and Web responsive fallback evidence;
- destination-first save cancellation and non-blocking generation evidence;
- 5,000-block interaction budget with no broad pagination on selection or pointer preview;
- a deletion ratchet proving removed fields, direct-media files, custom events, segmented targets, and legacy CSS cannot return.

## Ownership diagram

```text
Gesture / ribbon / keyboard / Objects & Layers
                 |
                 v
       View-owned interaction plane
       (transient preview only)
                 |
          one final typed command
                 v
        Notebook object commands
                 |
         one Tiptap transaction
                 v
 Schema 15 document + NotebookObjectFrameV1
                 |
                 +------------------------------+
                 |                              |
                 v                              v
   Derived object layout service     Immutable publication projection
                 |                              |
       immutable layout snapshot                +--> PDF/print adapter
                 |                              +--> DOCX adapter
                 +--> editor renderer            +--> Web adapter
                 +--> interaction hit boxes      +--> .cwiznb package
                 +--> pagination/wrap
                 +--> Objects & Layers projection
```

Asset bytes and immutable intrinsic metadata feed layout and publication by asset ID. They do not feed the command layer except for explicit Reset proportions/default-size commands.

## Explicit exclusions

- video;
- GIF or remote media;
- Graphing and Notebook solving;
- floating prose, headings, lists, inline math, page breaks, or running matter;
- tight/through contour wrapping;
- a second geometry registry;
- DOM-derived publication geometry;
- pointer-time document mutation;
- persisted hide-while-editing or interaction lock in V1;
- production implementation in this design gate.
