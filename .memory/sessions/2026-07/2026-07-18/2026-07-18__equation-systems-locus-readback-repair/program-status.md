# EQUATION-SYSTEMS-LOCUS-READBACK-REPAIR program status

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
- gate_type: ui
- date: 2026-07-18

## Status

- The repair is active and not complete.
- Work is being done directly on current `main`; the stale separate Equation worktree must not be merged wholesale.
- `src/lib/modes/equation/run.ts` remains out of scope and must stay unchanged.
- Commits still require explicit user approval after focused verification and Playwright evidence.
- Duplicate/source-corpus policy remains unchanged: do not silently generate variants; do not rerun duplicates as independent cases; do not re-record the same exact source/page/chapter sighting.

## Current checkpoint

- Incremental TypeScript currently passes with `npx tsc -b --pretty false`; the only observed output was the non-fatal `NO_COLOR`/`FORCE_COLOR` warning.
- The earlier editor-visible TypeScript blockers in `guarded/orchestrator.ts`, `substitution/log-combine.ts`, and `direct-square-substitution.ts` are no longer reproduced by the project build.
- The app-visible gate is not visually verified yet. User screenshots remain the current visual truth for the open UX/math-output problems until Playwright evidence proves otherwise.

## Remaining repair work

- Simultaneous systems: replace numeric-only 2x2/3x3 cells with MathLive scalar cells, preserve string-or-number replay, accept bounded affine symbolic coefficients, and classify unique, inconsistent, and infinite systems with clean rows plus RREF/rank/row-operation evidence.
- Direct complex loci: return direct locus answers for `Re(z)=c`, `Im(z)=c`, `conj(z)=z`, affine magnitude equations, zero-magnitude points, and `sqrt(|z|^2)=z`; defer only composite or non-affine locus forms with clear learner-facing meaning first.
- Presentation contract: render `abs(...)` as absolute-value bars everywhere visible, convert math-bearing detail prose to structured text-plus-math parts, remove duplicate/internal trust wording, avoid developer-style set braces for ordinary finite answers, keep branch parameters in `Valid When`, and normalize periodic RAD/DEG/GRAD readback structurally.
- Solver/readback corrections: restore parity branches for even and rational powers, make rational-hole no-solution cases successful empty-set answers with exclusions, finish sparse polynomial deflation and bounded rational-power substitution cases, parse pasted base-log forms safely, keep `log` base 10 distinct from `ln`, preserve exact textbook log algebra, and keep Complex On from losing validated positive-real log-combination roots.
- Polynomial 2x2: repair direct square and reciprocal-square substitutions, produce clean solution rows, and show exact no-real or empty-set evidence where appropriate.
- Verification/corpus: add or finish focused Vitest coverage, run Equation-specific Playwright for systems/loci/readback/logs/periodic/history/overflow, rerun only affected canonical corpus rows and Complex companions with the 45-second timeout policy, then run the required contract, file-size, memory, and diff gates before asking for commit approval.

## Known visual findings to preserve

- 2x2/3x3 linear systems still showed numeric boxes and poor evidence in the user screenshots; symbolic parameter entry was not visibly supported there.
- Locus cards were confusing because they showed a red unsupported error before mathematical meaning, even for direct `Re`, `Im`, and `abs` cases.
- `abs` input/readback appeared as command-like `abs(...)` in some places instead of absolute-value bars.
- Some detail cards exposed raw ASCII math and internal provenance wording such as trust metadata.
- Finite answers and branches sometimes appeared with developer-style braces instead of clean answer rows.
- DEG/GRAD periodic output lagged RAD simplification for cases like `2 sin^2(x)-1=0`.
- Base-log paste/readback and exact log algebra still need visual confirmation.
