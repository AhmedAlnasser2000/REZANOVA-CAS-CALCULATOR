# APP-SHELL-EAGER-SURFACE-LAZY-BOUNDARY1 Handoff

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.6
- primary_agent_family: sol
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.6
- recorded_by_agent_family: sol
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.6
- verified_by_agent_family: sol
- attribution_basis: live

## Status

- Move 20 is complete and verified for the approved checkpoint commit.
- The user explicitly brought the compact Graph piecewise UI restoration back into Move 20; it is included and verified.
- Stop after this commit. Do not start Move 21 or Move 22.
- No push is authorized.
- Preserve the untracked `test-results/graphing-minimum-visible-G-07137--gap-endpoints-consistently-chromium/` directory.

## Implemented Work

- Added honest lazy page boundaries for Formula Viewer, Guide, History, Notebook, Settings, Graphing, Statistics visualization, and specialized Calculus piecewise-limit UI.
- Kept surface/tab/runtime ownership intact; no capability IDs, worker ownership, OOE semantics, or workspace identities were merged.
- Split Graph session validation from its lightweight session identity and added a lazy `GraphWorkspacePageHost`.
- Split Equation transform contracts/labels from runtime execution and moved runtime/finalization behind dynamic loaders.
- Split Linear Algebra labels, active values, runtime revisions, scalar wire values, operation dispatch, and editor execution so Matrix/Vector math remains lazy while keeping separate runtime identities.
- Made persistence a thin async facade so validation/history implementation loads after the initial shell rather than becoming an eager entry dependency.
- Split Formula Viewer lightweight artifact contracts from heavy artifact construction; construction now loads only when the user opens Formula Viewer.
- Replaced broad result-contract barrel imports in startup paths with narrow consumer/validation/operator seams.
- Added a static standard-MathJSON operator registry so ordinary validation does not instantiate Compute Engine at startup.
- Removed the redundant Compute Engine variable analysis from one-letter stored-variable validation after existing reserved-name and syntax validation.
- Added explicit feature-local vendor chunks and removed the catch-all vendor chunk; the final successful build does not require `onlyExplicitManualChunks`.
- Restored the compact piecewise cases row with one expand/collapse action, visibility/delete controls, and diagnostics, while keeping the structured branch editor available below the read-only summary only when expanded.
- Kept palette controls, glowing curves, Three.js, and other later visual mock concepts out of Move 20.

## Completed Evidence

- Incremental TypeScript passes.
- The final production build passes with 4,457 modules and 123 chunks; the existing active-job-registry mixed-import warning is unchanged.
- The unchanged bundle ratchet passes at 1981.96 kB eager raw, 536.40 kB eager gzip, 841.39 kB largest app chunk, and a 1039.54 kB lazy Compute Engine chunk.
- Display contract inversion passes at the unchanged 440 producer boundaries, zero compatibility projections, and zero legacy reads; result-contract coverage passes 127 assertions.
- Focused runtime, persistence, Formula Viewer, Graph, Calculus, Linear Algebra, shell UI, and canonicalization tests pass.
- Compartment boundaries pass 36/36 over 1,423 source files; OOE boundaries pass 8/8; file sizes pass 10/10.
- Focused Chromium Playwright passes and captures collapsed and expanded piecewise states at 1440x940. Visual review confirms readable alignment, no overflow, no reorder controls, and no later-move appearance work.
- A wider diagnostic run's six failures reproduce unchanged on clean Move 19: one stale Graph document-revision assertion, one Tauri removal-count assertion, and four Equation transform expectations. They are not Move 20 regressions; the actual Move 20 persistence regression found during investigation was fixed and its focused test passes.

## Completion Boundary

- Commit this verified Move 20 checkpoint under the standing user approval.
- Exclude the protected untracked `test-results/` evidence directory; temporary Move 20 evidence remains under ignored `.task_tmp/`.
- Stop after commit with no push and no later-move implementation.
