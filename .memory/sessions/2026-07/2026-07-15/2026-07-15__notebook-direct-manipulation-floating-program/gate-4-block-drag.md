# `NOTEBOOK-BLOCK-DRAG-UNIFICATION2` — UI

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

## Gate State

- status: verified
- document contract: Schema 12 unchanged
- gate kind: ui

## Implemented Contract

- One Notebook pointer coordinator owns block movement from canvas and semantic Outline handles for media, Sections, academic containers, display equations, evidence, and dividers.
- Drag previews use one compact body-owned ghost and one fixed body-owned drop guide. They do not write transient attributes into ProseMirror-managed content.
- Before, after, and Section-interior destinations resolve against canvas nodes and Outline entries. A source cannot move inside its own subtree.
- Pointer release delegates to the existing `moveNotebookNode` command. Escape and pointer cancellation remove previews and commit nothing.
- Native draggable behavior is disabled for supported NodeViews and removed from Outline entries so it cannot compete with the Notebook pointer path.
- Every supported block exposes an explicit accessible move handle. Dividers use their visible rule as the pointer handle.
- Inspector Arrangement offers Move Up, Move Down, Move Into Section, and Move Out of Section with structure-aware disabled states and tooltips.

## Focused Verification

- Two selection/arrangement model tests and 30 `NotebookPage` UI tests passed.
- Five headless Chromium cases passed: canvas-to-Outline cancellation and move, Outline-to-Outline move, supported-block handle coverage, 2400/1440/1100 widths, 80/130 percent scale, and forced colors.
- Incremental TypeScript, scoped ESLint, file-size validation, and diff hygiene passed.
- No production build was repeated because this UI gate changes neither the persisted schema nor a native seam; the Schema 12 build remains applicable.

## Process Hygiene

- Evidence used a headless live-source Vite/Tauri session; no foreground interaction was required during final verification.
- All owned Calcwiz preview and Tauri processes were stopped afterward.
- The pre-existing Playwright test server remained untouched.
- Concurrent non-Notebook memory changes and untracked `test-results/` remain excluded from the selective commit.

## Gate Conclusion

- Unified block dragging is verified and ready for the selective milestone commit.
- `NOTEBOOK-FLOATING-OBJECT-MODEL1` is the next approved gate and will advance the persisted document contract to Schema 13.
