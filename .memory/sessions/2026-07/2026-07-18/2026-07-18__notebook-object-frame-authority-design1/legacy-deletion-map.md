# Notebook legacy object-runtime deletion map

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
- gate_type: backend
- date: 2026-07-18

Gate references use the Terra program in `terra-implementation-program.md`.

## Whole-file and major-component fate

| Current path | Current ownership | Fate | Deletion gate |
| --- | --- | --- | --- |
| `src/app/shell/notebook/canvas/NotebookDirectMediaInteraction.ts` | image resize/crop/rotate gesture and commits | replace completely with interaction-plane preview and object commands | Gate 4, hard-delete proof Gate 8 |
| `src/app/shell/notebook/canvas/NotebookDirectMediaCanvasCoordinator.ts` | global pointer listeners, media/block drag, segmented targets, float conversion, crop events | replace completely with interaction plane plus existing document move command | Gate 4, hard-delete proof Gate 8 |
| `src/app/shell/notebook/canvas/NotebookFloatingBlockInteraction.ts` | structured-object guide/ghost and placement calculation | migrate pure anchor/default helpers; delete pointer/UI path | Gates 2-4, hard-delete Gate 8 |
| `src/app/shell/notebook/canvas/NotebookImageNodeView.tsx` | content, selection chrome, handles, natural size, keyboard mutations | replace with passive image content renderer; overlay owns interaction | Gate 4, old file removed or rewritten beyond recognition by Gate 8 |
| `src/app/shell/notebook/canvas/notebook-pagination-dom.ts` | broad DOM collector and temporary style forcing | replace with targeted measurement registry | Gate 3, delete legacy collector Gate 8 |
| `src/app/shell/notebook/canvas/useNotebookPagination.tsx` | broad revision-triggered measurement, generated CSS/DOM mutation | retain hook boundary only if useful; rewrite to consume layout snapshot | Gate 3, old branches ratcheted out Gate 8 |
| `src/app/shell/notebook/canvas/NotebookPictureFormatControls.tsx` | UI plus direct legacy attr writes/custom events | retain UI; rewrite every geometry action to object command | Gates 2 and 4; old branches removed Gate 8 |
| `src/app/shell/notebook/NotebookObjectLayers.tsx` | floating-only document scan and direct layer moves | retain UI concept; rewrite to registry and commands | Gate 5 |

## Schema and adapter deletion

| File/symbol | Fate | Gate |
| --- | --- | --- |
| current `NotebookImageFigureNode.widthPercent` | compatibility source only in private Schema 14 type; absent current Schema 15 | Gate 1 |
| current `displayWidthPt`, `displayHeightPt`, `displayAspectRatio` | migrate to frame; remove current public fields | Gate 1 |
| current image `alignment`, `placement` | migrate to frame flow placement | Gate 1 |
| current image `rotation`, `crop` | migrate to frame image transform | Gate 1 |
| current eligible-node `objectPlacement` | migrate to frame placement and size | Gate 1 |
| `NotebookObjectPlacementAttributes` in `extensions.tsx` | replace with one `notebookObjectFrame` global attr | Gate 1 |
| image Tiptap dimension/alignment/placement/rotation/crop attrs | remove; retain semantic/content attrs only | Gate 1 |
| `objectPlacementAttr`, `objectPlacementAttrs`, split crop adapter branches | replace with one strict frame clone/adapter | Gate 1 |
| current-schema Rust image/placement legacy fields | move to private Schema 14 compatibility representation; current Schema 15 accepts frame only | Gate 1 |
| `notebookEffectiveImagePlacement`, percent wrap-cap calculations as geometry authority | replace with frame/layout wrap feasibility | Gate 3; delete Gate 8 |

## Mutation-path deletion

| Current mutation | Replacement | Gate |
| --- | --- | --- |
| NodeView `updateAttributes` for size/rotation/move | typed `NotebookObjectCommand` | Gate 2/4 |
| Picture Format `updateImage` legacy attr patches | typed command | Gate 2 |
| canvas `updateAttributes` for placement/percent/alignment | typed float/unfloat/move/wrap command | Gate 2/4 |
| `moveNotebookFloatingLayer` placement rewrite in `selection.ts` | layer command with stack normalization | Gate 2/5 |
| anchor-repair extension direct placement rewrite | anchor-repair object command appended to triggering transaction | Gate 2 |
| page-setup loop directly rewriting placement | page-setup/object-frame compound command for resolvable fixed boxes | Gate 2/3 |
| pagination callback causing return-to-flow transaction | derived finding plus explicit/approved single command | Gate 3 |
| crop-mode DOM custom events | interaction-plane mode state | Gate 4 |

## CSS and DOM deletion

| Current selector/data/variable | Fate | Gate |
| --- | --- | --- |
| `--notebook-image-width`, `--notebook-image-height`, `--notebook-media-display-aspect-ratio` as competing inputs | renderer receives one derived frame rectangle | Gate 3/4 |
| `data-image-sizing`, `data-image-alignment`, `data-image-placement`, `data-image-requested-placement` | replace with layout-snapshot classes/attributes only where semantic | Gate 3/4 |
| legacy square-left/right float and margin rules | replace with layout exclusions and flow fragments | Gate 3 |
| `[data-notebook-floating-object]` generated width/left/top overrides | renderer consumes layout snapshot directly | Gate 3 |
| `[data-notebook-flow-wrap-inset]` generated DOM mutation | derived flow fragment/layout output | Gate 3 |
| `.notebook-media-direct-controls` and NodeView-local handle rules | portal/overlay plane styles | Gate 4 |
| `.notebook-media-flow-targets` four-segment surface | delete; use insertion guide and whitespace float preview | Gate 4 |
| old drag ghost/drop guide/block floating guide | replace with overlay plane primitives | Gate 4 |
| `notebook-image-crop-mode-change` / `notebook-image-crop-mode-request` | delete | Gate 4 |
| selection outline suppression patches tied to old wrapper | remove after passive renderer/overlay parity | Gate 4/8 |

## Layout and publication deletion

| Current path | Fate | Gate |
| --- | --- | --- |
| `NotebookPaginationBlock.objectPlacement` and separate aspect/rotation members | replace with frame plus measurement input | Gate 3 |
| DOM temporary width forcing during measurement | delete | Gate 3 |
| selection changes incrementing the pagination revision | split selection from layout revision | Gate 3 |
| publication point/percent/aspect precedence helpers | consume immutable frame/layout projection | Gate 6 |
| Print projection legacy image placement classes | replace with projection geometry | Gate 6 |
| DOCX percentage fallback for current docs | frame-to-OOXML conversion; historical data normalized before projection | Gate 6 |
| Web legacy image classes/current floating-only warning | frame/layout wide output plus explicit narrow fallback | Gate 6 |
| Web/DOCX package generation before save destination | destination-first export flow | Gate 6 |

## Retained capabilities

- app-owned document and Tiptap adapter boundary;
- stable node IDs and general document move commands;
- safe image validation, content-addressed storage, intrinsic metadata, missing-image behavior;
- alt/decorative/caption/numbering semantics;
- persistence, atomic save, raw upgrade snapshot, history, Trash, recovery, `.cwiznb`;
- page setup, running matter, page breaks, keep-with-next, structured split policy;
- immutable publication projection and compatibility reports;
- Objects & Layers UI concept, rewritten as a registry projection;
- current focused gesture/pagination/publication tests as behavior evidence, rewritten against the new authority.

## Anti-zombie ratchet

Gate 8 must fail on any live current-schema or runtime reference to:

- removed image geometry keys;
- `notebookObjectPlacement`;
- `NotebookDirectMediaInteraction`;
- `NotebookDirectMediaCanvasCoordinator`;
- crop custom-event names;
- `.notebook-media-flow-targets`;
- current-schema percent-to-point geometry conversion;
- publication access to removed keys;
- direct object `updateAttributes` outside the object command module;
- pagination tied to selection or interaction revisions.

Historical Schema 14 compatibility names may remain only inside the compatibility directory, golden fixtures, and migration tests.
