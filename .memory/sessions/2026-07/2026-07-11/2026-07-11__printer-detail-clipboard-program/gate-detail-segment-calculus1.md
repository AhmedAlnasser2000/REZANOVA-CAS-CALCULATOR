# DETAIL-SEGMENT-CALCULUS1 Gate

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.6
- primary_agent_family: sol
- contributors:
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.6
- recorded_by_agent_family: sol
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.6
- verified_by_agent_family: sol
- attribution_basis: live

## Gate

- Kind: `backend` typed-producer migration with `ui` and real-browser rendering evidence.
- Result: pass.
- Runtime behavior changed: Calculus detail producers now construct explicit typed rows, and Calculus no longer calls legacy Limits string-inference helpers. Mathematical results, compatibility wording, card order, History persistence, workers, fallbacks, OOE, Clipboard, and Surface Protocol are unchanged.

## Contract Evidence

- The AST registry now recognizes `calculusDetailSection()` as a typed producer builder.
- The accepted inventory moved from 434 to 445 producers: 431 declared and 14 undeclared. Calculus moved from 15 undeclared among 22 visible producers to 33 declared and zero undeclared after its hidden typed producer seams became governed.
- Variable checks, route diagnostics, finite/infinite conclusions, integral methods and interval safety, improper-integral stops, and Laplace readback derive compatibility `lines` from explicit typed rows.
- A source audit rejects `limitDetailSectionFromLines()`, `limitMethodSection()`, and `withLimitDetailLineParts()` calls in production Calculus. One-sided domain subjects are rebuilt from structured constraints, preserving prior typed math without regex inference.
- Five existing golden interval/domain values now appear as additive typed mathematical fragments. The explicitly accepted print-hygiene manifest grows from 190 to 195 fragments with no removed evidence.

## Verification Evidence

- Focused Calculus: 27 files and 186 tests passed, including six runtime intent cases for mismatch, diagnostics, piecewise input, infinity conclusions, interval safety, and Laplace readback.
- Detail migration ratchet: seven tests and the accepted 445-producer inventory passed.
- Full unit: 500 files and 3,564 tests passed. Full UI: 62 files and 452 tests passed.
- Golden: 44; print hygiene: seven over 43 executions and 195 fragments; feature probes, all 100 History replay fixtures, the 515-path printer migration ratchet, and Clipboard contracts passed.
- Runtime probes passed 19 and workspace runtime contracts passed 74. All 19 Chromium canaries passed in 1.2 minutes.
- A fresh production build preceded Chromium evidence. Successful definite-integral interval notation and unsafe point/constraint/interval math rendered inline; inspected cards had no overlap, clipping, stale content, or unreadable overflow.
- TypeScript, production build, lint, file size, CI alignment, seam selection, Surface Protocol, OOE, compartments, Cargo check, and `git diff --check` passed.

## Remaining Boundary

- The accepted baseline preserves 14 undeclared fingerprints: workspace domains 3, Linear Algebra 1, and compatibility closeout 10.
- `DETAIL-SEGMENT-WORKSPACE-DOMAINS1` is next.
- Legacy and snapshot-less History retains renderer inference. The contract-review evidence checkpoint remains mandatory without an intermediate user pause.

## Durable Memory Updated

- `.memory/current-state.md`
- `.memory/decisions.md`
- `.memory/journal/2026-07/2026-07-11.md`
- `.memory/research/roadmaps/printer-detail-clipboard-roadmap.md`
- `.memory/sessions/2026-07/2026-07-11/2026-07-11__printer-detail-clipboard-program/`
