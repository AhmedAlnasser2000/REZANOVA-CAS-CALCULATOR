# NOTEBOOK-OBJECT-FRAME-AUTHORITY-DESIGN1 authority map

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

## Baseline

- `HEAD`: `a28383ee565fb24a9a6f99dd44097ccf0a83d907`
- Milestone present: `NOTEBOOK-OBJECT-INTERACTION-AUDIT1`
- Current Notebook document schema: 14
- Video: removed from the current contract
- Current dirty work: unrelated Equation/Display/result-contract work only; it was not modified by this gate.

## Persisted Schema 14 authorities

| Current field | Exact TypeScript source | Rust/Tiptap mirror | Ingestion or mutation source | Render / interaction consumers | Layout / publication consumers | Current status | Schema 15 fate |
| --- | --- | --- | --- | --- | --- | --- | --- |
| image `id` | `NotebookImageFigureNode.id`, `document/types.ts` | Rust image node; Tiptap `id` in `extensions.tsx` | generated in `NotebookRichCanvas.stageImageFile` | selection, NodeView, drag, Inspector | pagination fragments, Outline, publication | authoritative identity | preserve unchanged; registry key |
| image `assetId` | `NotebookImageFigureNode.assetId` | Rust image node; Tiptap `assetId` | asset-port result in `stageImageFile` | `NotebookImageNodeView` asset load | PDF/DOCX/Web and `.cwiznb` | authoritative content reference | preserve outside frame |
| `altText`, `decorative`, `caption`, `numbered` | `NotebookImageFigureNode` | Rust/Tiptap image attrs | Picture details dialog | image DOM, Outline, accessibility | all publication adapters | semantic, not geometry | preserve on node; never asset/frame metadata |
| `widthPercent` | `NotebookImageFigureNode.widthPercent`; `isNotebookMediaWidthPercent` | Rust current image validator; Tiptap `widthPercent` | older migration/insertion; Picture Format; media interaction; flow-drop coordinator | NodeView width precedence; CSS `--notebook-image-width`; direct interaction | page-layout wrap cap; Print, DOCX, Web | redundant size authority | migrate to canonical fixed width, then delete current field |
| `displayWidthPt` | `NotebookImageFigureNode.displayWidthPt` | Rust validator; Tiptap `displayWidthPt` | image insertion; pointer/keyboard resize; Picture Format | NodeView point width and handles | Print, DOCX, Web | competing size authority | migrate by precedence to `frame.size.width`; delete field |
| `displayHeightPt` | `NotebookImageFigureNode.displayHeightPt` | Rust validator; Tiptap `displayHeightPt` | insertion; pointer/keyboard resize; Picture Format | NodeView fixed height | DOCX; indirect DOM pagination | competing size authority | migrate to fixed frame height when present; delete field |
| `displayAspectRatio` | `NotebookImageFigureNode.displayAspectRatio` | Rust validator; Tiptap attr | insertion inspection; resize/reset; Picture Format | NodeView target ratio and crop/stretch stage | paginator media height; Print, DOCX, Web | redundant derived ratio | migrate to fixed height or intrinsic height mode; delete field |
| `alignment` | `NotebookImageFigureNode.alignment` | Rust validator; Tiptap attr | insertion default; Picture Format; flow-drop coordinator | NodeView data attr and CSS margins | Print/DOCX/Web | legacy placement fragment | migrate into flow placement; delete image field |
| `placement` | `NotebookImageFigureNode.placement` | Rust validator; Tiptap attr | insertion default; Picture Format; segmented drop coordinator | NodeView/CSS float and clear | page-layout effective wrap; Print/Web | legacy placement fragment | migrate into flow wrap/alignment; delete image field |
| `rotation` | `NotebookImageFigureNode.rotation` | Rust validator; Tiptap attr | Picture Format, keyboard, direct interaction | NodeView transform and handles | pagination transformed bounds; Print/DOCX/Web | valid presentation state but separately stored | migrate into image transform; delete field |
| `crop` | `NotebookImageFigureNode.crop` | Rust validator; four Tiptap attrs | crop event bridge/direct interaction | NodeView crop viewport and overlay | Print/DOCX/Web | valid presentation state but separately stored | migrate into image transform; delete split attrs |
| `objectPlacement` | eligible node fields in `document/types.ts`; `NotebookObjectPlacement` | Rust object-placement validator; Tiptap `notebookObjectPlacement` | canvas coordinator, block floating interaction, Picture/keyboard moves, anchor repair, layer moves | floating CSS/data attributes; NodeView move | paginator, Print projection, Web/DOCX findings | authoritative floating placement but also stores a second width | migrate into frame placement and size; delete field/current Tiptap attr |
| floating `widthPt` | `NotebookObjectPlacement` | Rust/Tiptap placement payload | whitespace drop and block float conversion | CSS floating width overrides image point/percent width | paginator and Print projection | second width authority | move to `frame.size.width`; remove from placement |
| floating `xPt`, `yPt` | `NotebookObjectPlacement` | Rust/Tiptap placement payload | drag/keyboard nudge/page clamp | generated absolute CSS | paginator/Print | authoritative canonical position | preserve inside floating frame placement |
| floating anchor/references | `NotebookObjectPlacement` | Rust/Tiptap placement payload | nearest-anchor helpers, settings defaults, anchor repair | Draft badge / selection info | paginator page resolution | authoritative | preserve inside frame placement |
| floating wrap/text distance | `NotebookObjectPlacement` | Rust/Tiptap placement payload | conversion defaults, controls/layer UI | flow insets | paginator exclusions; publication finding | authoritative | preserve inside frame placement |
| floating `zOrder` | `NotebookObjectPlacement` plus graph validation | Rust/Tiptap placement payload | next-z helper and `moveNotebookFloatingLayer` | floating CSS z-index; Objects & Layers | paginator/Print | authoritative layer order | preserve inside frame placement; normalize in one command |
| page setup | `NotebookRichDocument.pageSetup` | Rust doc; Tiptap doc attr | Layout controls | Print/Draft page shell | paginator and publication | authoritative page policy | preserve; frame coordinates remain canonical points |
| selected node ID | `NotebookRichDocument.selectedNodeId` | Rust/document adapter | editor selection sync | Inspector/context | not publication | legacy persisted editor selection, not geometry | outside frame; no role in registry geometry |

## Object-placement coverage

| Node type | Current placement field | Current sizing source | Schema 15 frame size | May float | Notes |
| --- | --- | --- | --- | --- | --- |
| image figure | legacy image fields plus `objectPlacement` | percent, points, ratio, floating width | fixed width plus fixed or intrinsic height | yes | image transform allowed |
| separate equation | `objectPlacement` | DOM/content height, floating width | available/fixed width plus auto height | yes | no rotation/crop |
| evidence snapshot | `objectPlacement` | DOM/content height, floating width | available/fixed width plus auto height | yes | no rotation/crop |
| divider | `objectPlacement` | DOM height, floating width | available/fixed width plus auto height | yes | no rotation/crop |
| academic container | `objectPlacement` | DOM/content height, floating width | available/fixed width plus auto height | yes | whole frame; auto-return-to-flow policy |
| Section subtree | `objectPlacement` | DOM/content height, floating width | available/fixed width plus auto height | yes | whole subtree; auto-return-to-flow policy |
| paragraph / heading / list / inline math / page break / running matter | none | document flow | none | no | paragraph IDs may be anchors only |

## Transient and editor authorities

| Authority | Exact file/symbol | Persisted? | Current role and conflict | Fate |
| --- | --- | --- | --- | --- |
| `NotebookMediaTransientGeometry` | `NotebookDirectMediaInteraction.ts` | no | carries percent, point dimensions, aspect, rotation, crop, and rectangle at once | replace with one preview frame derived from starting frame |
| direct-media gesture session | `useNotebookDirectMediaInteraction` | no | pointer capture and RAF preview inside image NodeView; commits attributes itself | replace with view-owned interaction plane; delete file after parity |
| image NodeView state | `NotebookImageNodeView.tsx` | no, except direct attr commits | owns natural-size load, selection, handles, crop mode, keyboard mutations, width precedence | replace with passive image content renderer plus overlay plane |
| canvas pointer coordinator | `NotebookDirectMediaCanvasCoordinator.ts` | no, but writes document | separately owns media/block drag, segmented targets, float conversion, crop event bridge, global listeners | replace with one interaction plane and object commands; delete |
| structured float helpers | `NotebookFloatingBlockInteraction.ts` | no, but builds placement | owns another guide/ghost and pointer-to-frame conversion | migrate anchor helpers to command/layout modules; delete pointer path |
| Picture Format local geometry state | `NotebookPictureFormatControls.tsx` | no, but writes attributes | reads/writes all legacy dimensions and dispatches crop custom events | keep controls, rewrite to typed object commands, delete custom events |
| Tiptap attrs | `NotebookObjectPlacementAttributes`, `ImageFigure` in `extensions.tsx` | editor mirror | mirrors many current fields independently | replace with one `notebookObjectFrame` attr |
| Tiptap adapter split crop | `objectPlacementAttrs`, image conversions in `tiptap-adapter.ts` | adapter | duplicates object placement and splits crop across four attrs | migrate to one frame clone and strict round trip |
| selection/layer mutation | `floatingNotebookNodes`, `moveNotebookFloatingLayer` in `selection.ts` | writes document | directly rewrites placement z-order | move mutation to object command module; keep general selection/move helpers |
| Objects & Layers projection | `NotebookObjectLayers.tsx` | no | lists only floating objects and re-parses placement from document | retain UI concept; consume registry for flow and floating objects |
| local Notebook preferences | `NotebookPreferences.authoring` | local settings | declares defaults for placement, anchor, wrap, width, references, grid/guides | preserve as defaults for future commands only; never document authority |

## Render and CSS authorities

| Current authority | File/symbol | Conflict | Fate |
| --- | --- | --- | --- |
| image figure CSS width | `.notebook-image-figure`, `data-image-sizing`, `--notebook-image-width` | percent/point precedence in renderer and CSS | replace with layout-snapshot rectangle |
| image height/aspect CSS | `.notebook-image-frame`, `--notebook-image-height`, `--notebook-media-display-aspect-ratio` | separately resolves fixed height and ratio | derive from frame and asset metadata only |
| legacy float CSS | `data-image-placement`, square-left/right rules | a second flow/wrap layout engine | delete after frame layout parity |
| floating generated CSS | `useNotebookPagination.tsx` and `[data-notebook-floating-object]` rules | mutates DOM styles/data attrs from pagination and overrides image width | replace with renderer consuming immutable layout snapshot |
| flow wrap inset CSS | `data-notebook-flow-wrap-inset` rules | generated broad DOM mutation | replace with derived layout fragments/exclusions |
| direct handle CSS | `.notebook-media-direct-controls`, resize/crop/rotation handles | NodeView-local overlay tied to wrapper geometry | replace with one portal/overlay interaction plane |
| four-segment drop surface | `.notebook-media-flow-targets` | forces coarse left/normal/right/floating choices | delete; use document insertion guides plus whitespace float preview |
| crop custom-event bridge | `notebook-image-crop-mode-change` / `notebook-image-crop-mode-request` | crosses toolbar, coordinator, NodeView with no typed command | delete; interaction mode belongs to plane |

## Layout and pagination authorities

| Current authority | Exact source | Inputs | Outputs/side effects | Fate |
| --- | --- | --- | --- | --- |
| flow pagination | `paginateNotebookBlocks`, `pagination.ts` | measured blocks/page setup | page fragments | preserve page policy, change object input to frames |
| floating pagination | `resolveFloatingFragments`, `floatingExclusions` | placement width, DOM height/aspect/rotation | point fragments, wrap exclusions, return-to-flow IDs | replace input with canonical frame plus targeted measurement; retain tested policy |
| transformed bounds | `transformedSize`, `pagination.ts` | width/height/rotation | rotated bounds | preserve formula as shared derived geometry |
| DOM block collector | `notebook-pagination-dom.ts` | Tiptap attrs and broad DOM measurement | `NotebookPaginationBlock[]`; temporarily forces floating width styles | replace broad collector with measurement registry; delete style forcing |
| pagination hook | `useNotebookPagination.tsx` | broad document/selection revision | generated styles, DOM attrs, page metrics, flow return transaction callback | retain hook boundary only if useful; rewrite around layout service and separated revisions |
| page setup clamp | `changePageSetup`, `NotebookRichCanvas.tsx` | placement and measured DOM height | rewrites placement in page-setup transaction | move fixed-geometry clamp to command layer; auto-height remains derived finding |
| oversized structured return | `returnFloatingObjectsToFlow`, `NotebookRichCanvas.tsx` | paginator IDs | extra document transaction | make an explicit one-command policy; layout must not mutate |
| revision trigger | `NotebookRichCanvas` `onUpdate` / `onSelectionUpdate` | content and selection | increments same revision, runs selection/Inspector sync | split document/layout/selection/interaction revisions |

## Publication authorities

| Destination | Current source | Current geometry truth | Problem | Schema 15 fate |
| --- | --- | --- | --- | --- |
| immutable projection | `publication/projection.ts`, `types.ts` | document clone plus optional source layout | carries useful immutable boundary but still exposes legacy fields | retain boundary; include canonical frames and authoritative derived layout |
| PDF/print | `NotebookPrintProjection.tsx` | floating fragments if present; otherwise point or percent fields and image classes | mixed field precedence; editor-style classes | consume projection layout/frame only |
| DOCX | `publication/docx.ts` | point/percent/aspect/intrinsic fallback | floating placement only reports a fallback; no canonical anchor conversion | convert projection frame to OOXML/EMU; report unsupported structured anchors |
| Web | `publication/web.ts` | point/percent/aspect and legacy placement classes | floating becomes ordered flow fallback without canonical wide/print placement | use frame/layout for wide/print, explicit narrow flow fallback |
| `.cwiznb` | package manifest/document JSON/assets | current document | lossless but carries competing Schema 14 fields | store Schema 15 frame losslessly |
| export order | File backstage/dialog/job/save port | Web/DOCX package may be built before destination is chosen | expensive work can block renderer before save location | choose destination and save path before generation |

## Migration sources and targets

| Schema era | Current migration role | Object-frame target |
| --- | --- | --- |
| 1-5 | TypeScript-only best-effort recovery into current | existing ingress reaches Schema 14, then one 14->15 normalization |
| 6-11 | formally durable rich documents | existing transformations, then frame normalization |
| 12 | precise image point dimensions | point fields feed image fixed/intrinsic frame precedence |
| 13 | optional `objectPlacement` | placement and floating width feed one frame |
| 14 | video removal/current | exact source for frame migration; video remains absent |
| 15 | proposed current | every eligible object has exactly one frame; old keys forbidden |

## Conclusion

The repo has no newer conflicting Notebook authority beyond the audit baseline. TypeScript and Rust already share enough strict Schema 14 structure to define a common Schema 15 frame. The incompatibility is not representational; it is ownership duplication. The contract can therefore proceed without production experiments, video, Graphing, or a second geometry model.
