# `NOTEBOOK-MEDIA-GEOMETRY2` — Backend / Schema 12

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
- document contract: Schema 12
- gate kind: backend/schema with focused UI measurement

## Implemented Contract

- Schema 12 is the only new-write contract. Schema 11 validates strictly and migrates losslessly by changing only the document version.
- Image and video `widthPercent` accepts finite values from 10 through 100 with at most three decimal places. Schemas 6 through 11 retain their historical integer-width validation.
- TypeScript, IndexedDB, Tauri/Rust storage, snapshots, Trash, recovery, and `.cwiznb` ingress migrate durable Schemas 6 through 11 to current Schema 12 in memory.
- Media manipulation now measures one full viewport rectangle shared by content, selection border, and handles. Editor padding and page UI scale are converted through one viewport-pixel policy.
- Resize previews retain precise percentages, clamp through usable page bounds, and fit rotation-aware image bounds. The hidden 52-percent wrapped-media CSS ceiling is removed; the existing page-layout minimum-text-column rule remains the wrapping authority.
- New media no longer treats a missing width attribute as numeric zero. Missing width preserves the 100-percent legacy default.
- Image and video custom-width controls accept and normalize three-decimal precision.
- React-state-per-pointer-move remains intentionally unchanged for `NOTEBOOK-MEDIA-GESTURE-LOOP2`.

## Quantitative Browser Evidence

- A dedicated 12-case Chromium probe covered images and videos in Print and Draft at 80, 100, and 130 percent page UI scale.
- Every selected object exposed eight handles, and figure/frame width mismatch was 0 pixels before and after release.
- Worst first-move handle/pointer separation: 0.313 CSS pixels.
- Worst preview handle/pointer separation: 0.322 CSS pixels.
- Worst release handle/pointer separation: 0.369 CSS pixels.
- Worst preview-to-release rectangle difference: 0.109 CSS pixels.
- These measurements pass the locked 3-pixel handle/pointer and 2-pixel release-parity ceilings.
- The focused production-preview image/video suite passed 4 of 4 after rebuilding `dist/`. The earlier red run used a stale 4173 production preview while the live source probe used port 1420; no runtime workaround was added for that test-environment mismatch.

## Focused Verification

- 80 TypeScript model, migration, adapter, geometry, pagination, page-layout, and persistence tests passed.
- The complete 30-case `NotebookPage` UI file was exercised: 28 unaffected cases passed in the first run, and the two precise-width expectation deltas passed after their bounded assertion update.
- 18 focused Rust Notebook storage/package tests passed, including Schema 11 migration and decimal-width rejection bounds.
- Incremental TypeScript, Notebook-scoped ESLint, Rust formatting, production build, file-size validation, and diff hygiene passed.
- The initial file-size run correctly caught `NotebookPage.ui.test.tsx` at 1501 lines; the assertion was compacted without raising the cap, and the file now remains at the 1500-line limit.

## Evidence Artifacts

- `.task_tmp/notebook-direct-manipulation-floating-program/browser-geometry-audit.json`
- `.task_tmp/notebook-direct-manipulation-floating-program/browser-geometry-audit.log`
- `.task_tmp/notebook-direct-manipulation-floating-program/schema12-playwright-current/`
- Temporary evidence remains ignored and is not runtime or product input.

## Gate Conclusion

- The Schema 12 geometry foundation is verified and ready for selective commit.
- The next gate owns the requestAnimationFrame preview loop, pointer capture lifecycle, and one-commit gesture transaction. Floating placement remains deferred until Schema 13.
