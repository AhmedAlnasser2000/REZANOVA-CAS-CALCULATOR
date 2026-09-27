# Formal implicit graphing — partial verification, 2026-09-26

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-6-astra
- primary_agent_family: astra
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-6-astra
- recorded_by_agent_family: astra
- verified_by_agent: codex
- verified_by_agent_model: gpt-6-astra
- verified_by_agent_family: astra
- attribution_basis: live

## Backend gate — partial, not complete

- GMP 6.3.0 and MPFR 4.2.2 compiled to WASM in ignored `.task_tmp/`.
  Directed-rounding `log(2)`/`sin(1)` smoke returned success in Node 24 and
  headless Chrome. WASM size 283,221 bytes; JS loader 9,570 bytes.
- Cross-target library test suites, configure-assumption review, license and
  relinking review, reproducible shipping build, Graph worker integration, and
  Tauri smoke remain unpassed. No library or WASM was adopted by the app.
- Exact-rational cell prototype: 7 focused tests pass. It covers integer-leaf
  algebraic signs only and is not a complete viewport proof.
- Removed the five-point axis line heuristic. Axis interval emission now needs
  exact cell-wide zero proof. Removed the fixed depth-seven cutoff for mixed
  finite/non-finite refinement; size and existing hard budgets remain. A
  refinement-share guard prevents optional mixed-cell work from exhausting
  the whole viewport before base-cell coverage.
- `vitest` focused implicit + proof-cell files: 18 tests passed. `tsc -b`
  passed. `npm run test:file-sizes` passed. No full suite run.

## UI gate — inspected, not accepted as formal

- Headless system Chrome opened the real Graph at 1440x940. Both reported
  mixed-power and nested-log expressions rendered one SVG path and visible
  `Uncertain region cells were omitted safely.` status before and after one
  wheel zoom. No page errors were observed. Screenshots remain in ignored
  `.task_tmp/graph-proof-sources/`.
- Mixed power has a visibly incomplete zero-axis branch. Nested log shows
  contours, but neither output carries segment certificates, unresolved-cell
  location evidence, or the specified inspection overlay. This is not
  mathematical or visual acceptance of the requested formal solver.
- A zoomed-out mixed-power view remains blank and shows a visible unresolved
  warning after the refinement-share guard. It no longer silently draws a
  false line, but this is a failed coverage/usability gate, not a solved view.

## Stop boundary

- No commit or push. The full proof-aware sampler, transient contract/UI,
  correctness corpus, three-app fair benchmark, and GPU follow-up remain open.
- Preserve the other agent's concurrent `.memory/` and calculus changes and
  the existing playground metadata changes.

## 2026-09-27 research closeout and rollback

- User authorized a selective commit and reversal of unnecessary implicit changes.
  The uncommitted `implicit.ts` and `implicit.test.ts` changes were restored to
  the committed implementation because the partial formal experiment did not
  certify contours or deliver the requested coverage/UI gates.
- The untracked proof-cell prototype and tests were moved to ignored
  `.task_tmp/graph-proof-sources/` for recoverable research; no proof module is
  imported by product source. This does not claim the committed sampler is
  correct on the difficult domain-boundary cases.
- The backend feasibility note, this dossier, mirror metadata, and local
  comparison instructions remain useful documentation for a later design.
  No MPFR/GMP artifact was adopted. Integration work remains a separate lane.
- Verification after rollback: `implicit.test.ts` 8/8 passed; file-size and
  memory-protocol validators passed; `git diff --check` passed. Real Graph
  Playwright/Chrome inspection at 1440x900 rendered `x^2+y^2=4` as a complete
  circle with `Ready` status and no page error; screenshot is ignored
  `.task_tmp/graph-proof-sources/post-rollback-circle.png`. No TypeScript
  rerun was needed for this documentation-only commit because product source
  equals HEAD. This smoke does not close known implicit-domain gaps.
