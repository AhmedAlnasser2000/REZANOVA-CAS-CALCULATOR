# Terra implementation program: Notebook object-frame replacement

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

The sequence is dependency-driven. Each gate is a separately reviewed milestone and commit. Terra must not begin until the Sol contract is approved.

## Gate 1 - `NOTEBOOK-OBJECT-FRAME-SCHEMA1`

- Objective: advance current documents to Schema 15 and make `NotebookObjectFrameV1` the only current persisted geometry/placement authority.
- Terra level: High.
- Allowed touchlist: Notebook document types, private compatibility types, validators, migrations, Tiptap extensions/adapters, TypeScript/Rust compatibility manifest and golden fixtures, browser/Rust persistence/package tests, required memory.
- Forbidden paths: image gesture/UI/CSS, paginator behavior, publication adapters, Settings host, OOE, solvers, Graphing, app-state schema beyond the existing Notebook preference projection.
- Dependencies: approved V1 contract and exact migration fixtures.
- Production behavior changed: durable current schema becomes 15; valid older documents normalize in memory and save as Schema 15 after the existing raw upgrade snapshot.
- Migration impact: formal Rust support becomes V6-V15; V1-V5 remain TypeScript-only best effort; current Tiptap mirror uses one frame attr.
- Focused tests: every precedence/repair fixture; strict unknown-key/hybrid rejection; Tiptap, IndexedDB, Rust, history, Trash, recovery, `.cwiznb` round trips; raw pre-upgrade snapshot.
- Broad gates: incremental TypeScript, focused Rust storage/package tests, file-size, memory protocol, diff hygiene, production build at schema closeout.
- Manual verification: open/save/restart a real Schema 14 document with flow and floating images and verify content/appearance before interaction work.
- Deletion obligations: remove legacy geometry keys from current public types, validator, Tiptap attrs, and save output; retain them only in private Schema 14 ingress.
- Stop conditions: TypeScript/Rust mismatch; valid Schema 14 visual state cannot be represented; runtime would need two persisted truths; video reintroduction.

## Gate 2 - `NOTEBOOK-OBJECT-COMMAND-AUTHORITY1`

- Objective: create one typed object-command module and route all non-pointer controls through it.
- Terra level: High.
- Allowed touchlist: Notebook command module, selection/document move helpers, Picture Format, Inspector/object actions, layer commands, anchor repair, page-setup compound commands, focused tests.
- Forbidden paths: new overlay implementation, broad paginator rewrite, publication adapters, unrelated app shell/runtime.
- Dependencies: Gate 1 current frame.
- Production behavior changed: ribbon, keyboard, anchor, wrap, float/unfloat, layer, and explicit size changes use one transaction/undo path.
- Migration impact: none beyond Schema 15; commands reject legacy attrs.
- Focused tests: command eligibility; one transaction/undo; z normalization; anchor repair; page setup; reorder; crop/rotation/size normalization; autosave coalescing.
- Broad gates: incremental TypeScript, Notebook-scoped ESLint, file-size, memory, diff hygiene.
- Manual verification: Picture Format and Objects & Layers commands preserve selection and undo exactly once.
- Deletion obligations: remove direct geometry `updateAttributes` from controls, layer UI, anchor repair, and page-setup branches.
- Stop conditions: any operation requires a second command authority; Tiptap cannot group a compound move/frame edit into one undo entry.

## Gate 3 - `NOTEBOOK-OBJECT-DERIVED-LAYOUT1`

- Objective: build the immutable object-layout snapshot and make pagination/render placement consume it without broad DOM mutation.
- Terra level: High.
- Allowed touchlist: Notebook pagination model/service, targeted measurement registry, page layout hook, passive renderer integration, page policy tests, layout CSS.
- Forbidden paths: pointer interaction plane, publication destinations, Settings, non-Notebook page engine.
- Dependencies: Gates 1-2.
- Production behavior changed: flow/floating placement, rotation bounds, wrapping, Draft placeholders, and page setup derive from frames; selection no longer repaginates.
- Migration impact: none.
- Focused tests: frame-to-layout geometry; auto/intrinsic/fixed size; transformed bounds; paragraph/page anchors; blank pages; exclusions; margins/running matter; oversized structures; revision separation; no layout writes.
- Broad gates: focused 5,000-block benchmark, incremental TypeScript, file-size, memory, diff hygiene.
- Manual verification: Print/Draft at 80/100/130%, paper/orientation/margins, narrow width, header/footer exclusion.
- Deletion obligations: remove temporary DOM width forcing, broad selection-driven pagination revision, generated legacy placement CSS/attrs, and automatic paginator mutation.
- Stop conditions: layout needs to persist measured pixels; auto-height cannot be represented without a second document field; selection still triggers full pagination.

## Gate 4 - `NOTEBOOK-OBJECT-INTERACTION-PLANE1`

- Objective: replace NodeView/direct-media/coordinator gesture ownership with one view-owned overlay and requestAnimationFrame preview.
- Terra level: High.
- Allowed touchlist: new Notebook interaction plane, passive image renderer, canvas integration, overlay styles, focused image/object gesture tests.
- Forbidden paths: document schema, Rust, publication, Graphing, new general interaction framework.
- Dependencies: Gates 1-3.
- Production behavior changed: selection frame, resize, crop, rotate, move, float/unfloat, insertion guides, snapping, cancellation, and pointer hit testing use the new plane.
- Migration impact: none.
- Focused tests: eight handles, anchor invariants, fixed/intrinsic image sizing, distortion only through explicit command/modifier, crop minimum, rotation bounds, pointer capture, Escape, preview/commit parity, one command/undo, no preview mutation/serialization/layout.
- Broad gates: Playwright 2400/1440/1100 and 80/100/130%, Print/Draft, forced colors; incremental TypeScript, scoped lint, file-size, memory, diff hygiene.
- Manual verification: real PNG/JPEG/WebP/SVG insert, enlarge/shrink by every handle, rotate/crop, whitespace float, insertion-guide flow return, no stale rectangle.
- Deletion obligations: delete `NotebookDirectMediaInteraction.ts`, `NotebookDirectMediaCanvasCoordinator.ts`, old pointer portions of `NotebookFloatingBlockInteraction.ts`, NodeView handles, crop custom events, four-segment target surface, old gesture CSS.
- Stop conditions: overlay must persist geometry; React/Tiptap updates occur per pointer sample; old and new gesture paths can both mutate one object.

## Gate 5 - `NOTEBOOK-OBJECT-REGISTRY-LAYERS1`

- Objective: make Objects & Layers and alternate selection consume one registry derived from document IDs and layout hit boxes.
- Terra level: Medium.
- Allowed touchlist: Notebook registry, Objects & Layers, overlay hit selection, left rail UI/tests, local session view state.
- Forbidden paths: document schema, asset records, persistent app-state widening, publication adapters.
- Dependencies: Gates 1-4.
- Production behavior changed: panel lists flow and floating objects; Alt-click cycles overlap; behind-text objects remain selectable; session hide/lock work.
- Migration impact: none; registry is non-persisted.
- Focused tests: registry identity, incremental update, z hit order, Alt-cycle reset, panel selection, layer commands, hide/show, lock/unlock, flow/floating labels.
- Broad gates: focused Playwright including forced colors and narrow rail, incremental TypeScript, scoped lint, file-size, memory, diff hygiene.
- Manual verification: overlapping front/behind objects, panel selection, hidden-while-editing still exports, focus restoration.
- Deletion obligations: remove floating-only document scans and direct layer mutation from the current panel.
- Stop conditions: registry stores geometry or diverges from node IDs; hidden/locked state changes durable output.

## Gate 6 - `NOTEBOOK-OBJECT-PUBLICATION-DESTINATION1`

- Objective: project canonical frames/layout immutably and make export destination-first.
- Terra level: High.
- Allowed touchlist: Notebook publication projection, PDF/print, DOCX, Web, `.cwiznb` validation, export dialogs/jobs/save port, compatibility tests and fixtures.
- Forbidden paths: editor DOM geometry, interaction plane, video, new import formats, direct PDF byte engine.
- Dependencies: Gates 1 and 3; Gate 5 registry is not a publication dependency.
- Production behavior changed: save destination is selected before expensive generation; PDF uses authoritative layout; DOCX/Web consume canonical projections and report degradation.
- Migration impact: `.cwiznb` stores Schema 15; older packages enter through migration.
- Focused tests: frozen projection; point/EMU/CSS conversion; layers/wrap/crop/rotation; selected scope; cancellation before generation; missing assets; compatibility findings; no object URLs/local paths.
- Broad gates: production build, focused Rust package/save tests, LibreOffice render, Microsoft Word smoke if available, Web ZIP inspection, memory/file-size/diff gates.
- Manual verification: choose visible destination for DOCX/Web/portable copy, cancel without freeze/write, PDF print dialog, open outputs.
- Deletion obligations: remove destination adapters' legacy field precedence and any editor-DOM dependency; remove build-before-picker ordering.
- Stop conditions: a destination demands a second stored geometry; renderer blocks before destination choice; fallback is silent.

## Gate 7 - `NOTEBOOK-OBJECT-ACCESSIBILITY-PERFORMANCE1`

- Objective: close keyboard/screen-reader parity and prove the interaction/layout hot-path budget.
- Terra level: Medium.
- Allowed touchlist: overlay focus model, point/size fields, live regions, keyboard mappings, performance instrumentation/tests, Notebook seam-impact selection.
- Forbidden paths: schema changes, broad app shortcut redesign, unrelated performance architecture.
- Dependencies: Gates 2-5.
- Production behavior changed: full keyboard access, announcements, deterministic focus, explicit size/position controls.
- Migration impact: none.
- Focused tests: nudge/resize steps, focusable handles, align/wrap/float/layer alternatives, screen-reader text, no global interception, one undo, 5,000-block gesture trace.
- Broad gates: Playwright keyboard/forced-colors, performance budgets, incremental TypeScript, scoped lint, file-size, memory, diff hygiene.
- Manual verification: complete object edit without pointer; screen-reader smoke; keyboard body editing unaffected.
- Deletion obligations: remove NodeView-local keyboard mutation branches and duplicate live regions.
- Stop conditions: keyboard uses a different mutation path; pointer preview triggers serialization/pagination/autosave; normal edit P95 exceeds the committed budget.

## Gate 8 - `NOTEBOOK-OBJECT-AUTHORITY-CLOSEOUT1`

- Objective: hard-delete every superseded authority and install anti-regrowth ratchets.
- Terra level: High.
- Allowed touchlist: Notebook cleanup paths, focused ratchets, compatibility boundary, session/memory closeout.
- Forbidden paths: new features, new abstractions, non-Notebook cleanup, soft deprecation aliases.
- Dependencies: Gates 1-7 verified.
- Production behavior changed: none intended beyond removal of unreachable/obsolete paths.
- Migration impact: Schema 15 remains current; Schema 14 names remain only in compatibility ingress and fixtures.
- Focused tests: forbidden-symbol/path ratchet; current-schema key inventory; one command authority; one layout service; one overlay plane; no direct geometry writes; complete focused gesture/pagination/publication suite.
- Broad gates: production build, incremental TypeScript, scoped ESLint, relevant Rust tests, compatibility command, file-size, memory protocol, diff hygiene, final focused Playwright matrix.
- Manual verification: final real-document smoke for open/save/restart, image edit, overlap/layers, Print/Draft, export destinations.
- Deletion obligations: every item in `legacy-deletion-map.md`; lower file-size baselines after slimming.
- Stop conditions: any legacy runtime remains load-bearing; a compatibility branch exists outside ingress; verification depends on both old and new paths.

## Delivery discipline

- One selective commit per named gate after explicit approval.
- No push without separate approval.
- Preserve unrelated Equation, Display, Linear Algebra, Statistics, result-contract, and `test-results/` work.
- At most four Vitest workers and one Playwright worker.
- Stop previews, drivers, and Playwright processes after evidence.
- Every gate records UI/backend evidence and required durable memory before commit.
