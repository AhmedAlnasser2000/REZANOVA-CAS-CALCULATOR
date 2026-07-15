# `NOTEBOOK-MEDIA-PLACEMENT2` — UI

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

- The selected media rectangle now follows the drag pointer through one canvas-owned ghost without duplicate React and native pointer reports.
- Insertion destinations render through a body-owned fixed guide rather than mutating ProseMirror-managed DOM. Drops continue using the existing `moveNotebookNode` mutation authority.
- The visible page body exposes left-wrap, normal-flow, and right-wrap targets. Normal flow clears alignment/placement; wrapping sets the matching side.
- Edge autoscroll continues on animation frames while the pointer remains near the scroll-region edge, recomputes the current target after each scroll, and resolves the final destination at a scroll boundary.
- Escape and pointer cancellation remove the ghost, guide, flow targets, autoscroll frame, and transient status without changing the document.
- Image and video wrapping use the same physical/rendered minimum text-column calculation. A wrap drop clamps persisted width to the strictest usable maximum so stored intent matches the rendered result at drop time.
- The pristine writing prompt and template suggestion are positioned inside the page stage. They remain within the visible canvas without changing pristine detection or template insertion behavior.

## Focused Verification

- 28 page-layout tests and 11 direct-media geometry tests passed.
- Three focused `NotebookPage` UI cases passed for starter templates, image direct formatting, and video direct formatting/persistence.
- Headless Chromium video evidence passed insertion-guide reordering, continuous edge autoscroll, Escape cancellation, explicit left wrapping, persisted Schema 12 state, 2400/1440/1100 widths, 80/130 percent scale, and forced colors.
- Headless Chromium authoring evidence passed writing/template containment at 2400, 1440, and 1100 pixels plus the existing wide-stage, rail-resize, and high-contrast checks.
- Incremental TypeScript, scoped ESLint, file-size validation, and diff hygiene passed.
- No production build was repeated because this UI gate changes neither the persisted schema nor a native seam; the Schema 12 build remains the applicable closeout.

## Process Hygiene

- Validation used a headless live-source Vite preview on port 1420; no foreground window was opened.
- The owned preview process was stopped after evidence capture.
- The pre-existing Playwright test server was left untouched.
- Concurrent non-Notebook source/memory changes and untracked `test-results/` remain excluded from the selective commit.

## Gate Conclusion

- Flow placement and pristine onboarding containment are verified and ready for the selective milestone commit.
- `NOTEBOOK-BLOCK-DRAG-UNIFICATION2` is the next approved gate.
