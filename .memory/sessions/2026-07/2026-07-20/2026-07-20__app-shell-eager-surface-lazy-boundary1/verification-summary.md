# APP-SHELL-EAGER-SURFACE-LAZY-BOUNDARY1 verification summary

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
- gate_type: backend and ui
- date: 2026-07-20
- commit_hash: pending at write time

## Passing evidence

- `npx tsc -b --pretty false` passes.
- The production build passes with 4,457 modules and 123 chunks; the existing active-job-registry mixed-import warning remains informational.
- `npm run test:bundle-size` passes the unchanged limits at 1981.96 kB eager raw, 536.40 kB eager gzip, and 841.39 kB largest app chunk. Compute Engine remains a 1039.54 kB lazy chunk.
- Focused standard tests pass across Graph session, Formula Viewer artifacts, persistence, variable validation, Linear Algebra requests/scalar wire, and Calculate/runtime prompt paths.
- Focused UI tests pass across Graph (20), Calculus limit (20), ActiveSurfaceHost (7), AppMain workspace tabs (8), Linear Algebra editor source (6), Formula Viewer/Linear Algebra shell (18), and paste canonicalization (1).
- `npm run test:display-contract-inversion` passes 24/24 with the unchanged inventory of 440 producer boundaries, zero compatibility projections, and zero legacy reads.
- `npm run test:result-contract` passes 18 files and 127 assertions; focused MathJSON coverage passes 4/4.
- `npm run test:compartments-boundaries` passes 36/36; `npm run test:ooe-boundaries` passes 8/8; `npm run test:file-sizes` passes 10/10.
- Focused Chromium Playwright passes the piecewise condition scenario at 1440x940 and captures both collapsed and expanded authoring states.

## Visual evidence

- Temporary evidence: `.task_tmp/APP-SHELL-EAGER-SURFACE-LAZY-BOUNDARY1/playwright-results/graphing-minimum-visible-G-07137--gap-endpoints-consistently-chromium/graphing-piecewise-condition-evidence-1440x940.png`.
- Temporary evidence: `.task_tmp/APP-SHELL-EAGER-SURFACE-LAZY-BOUNDARY1/playwright-results/graphing-minimum-visible-G-07137--gap-endpoints-consistently-chromium/graphing-piecewise-expanded-editor-1440x940.png`.
- Direct review confirms compact row alignment, readable diagnostics, non-overflowing branch inputs, clear collapsed/expanded hierarchy, and no later-move palette or glow treatment.

## Diagnostic baseline evidence

- A wider non-UI diagnostic run exposed six failures. The same six reproduce on clean Move 19 at `830d8851`: one Graph document-revision assertion, one Tauri removal-count assertion, and four Equation transform expectations.
- These are recorded as pre-existing rather than hidden or claimed green. The distinct Move 20 persistence regression found during investigation was fixed and its focused test passes.

## Final hygiene

- Memory protocol and diff hygiene are rerun after the final durable-memory edits.
- The protected untracked `test-results/graphing-minimum-visible-G-07137--gap-endpoints-consistently-chromium/` directory is excluded from the commit.
