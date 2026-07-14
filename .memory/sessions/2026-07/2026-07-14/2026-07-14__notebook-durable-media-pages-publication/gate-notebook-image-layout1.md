# NOTEBOOK-IMAGE-LAYOUT1

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

- milestone: `NOTEBOOK-IMAGE-LAYOUT1`
- kind: ui
- status: verified
- approval: standing user approval recorded on 2026-07-14
- push_authorization: none

## Implemented Contract

- Picture Format activates the V7 image metadata already carried by V8 documents: 25%, 50%, 75%, and 100% presets; custom 10-100% width; left, center, and right alignment; Normal flow, Top and Bottom, Square Left, and Square Right; non-destructive crop; and 90-degree rotation.
- Every picture-format action restores the image node selection and enters undo history as one deliberate transaction. Crop and rotation change metadata only; accepted SVG remains vector data and raster source bytes remain untouched.
- Square wrapping uses canonical V8 page geometry and the live rendered editor content width. The requested wrap preference remains serialized, while rendering falls back to normal flow whenever page margins, viewport width, or UI scaling cannot retain a 240px text column.
- Pagination follows the computed float state that is actually rendered. Narrow or scaled fallbacks therefore do not reserve phantom wrapped-media space, and the same effective-placement resolver remains available to later print and publication projections.

## Verification Evidence

- Focused page-layout, pagination, and Tiptap-adapter evidence passes 3 files and 37 tests.
- The complete Notebook page UI suite passes 28 cases, including serialized width/alignment/placement/crop/rotation state, selection restoration, transient dismissal, and separate undo/redo for picture operations.
- All 3 dedicated Chromium image scenarios pass. Evidence covers 2400px, 1440px, and 1100px plus 80%, 130%, and forced colors, persistent IndexedDB metadata, contained Picture Format popovers, and readable square-wrap fallback.
- Visual inspection confirms comfortable side text at 1100px and normal-flow fallback at 130% forced colors while the stored Square Left preference remains unchanged.
- Incremental TypeScript, Notebook-scoped ESLint, file-size validation, and diff hygiene pass. No redundant production build or broad unit/UI/canary suite ran.
- The live Vite and Playwright processes used for evidence are stopped. Untracked `test-results/` and concurrent solver/result-contract changes remain excluded.

## Handoff

- `NOTEBOOK-VIDEO1` is the next gate.
- Video adds strict V9 document and native ranged-media behavior; it must not reuse image wrapping, crop, or rotation controls.
