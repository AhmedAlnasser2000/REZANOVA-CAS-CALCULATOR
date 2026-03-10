# Current State

## Active Context
- Workspace: `Calcwiz`
- Active branch context: `main` with local milestone commits and no upstream configured yet in this workspace.
- Workflow default: commit-first with meaningful verified gates and explicit approval before commit or push.

## Current Product Phase
- Post harmonization pass for the three guided cores:
  - Geometry
  - Trigonometry
  - Statistics
- Post initial launcher/category and top-panel Guide consolidation.
- Post workflow and memory infrastructure overhaul to Memory V2.
- Track `R` decomposition sweep is closed and regression-verified.

## Stable Architecture Snapshot
- Desktop-first calculator with Tauri shell and React/TypeScript frontend.
- MathLive-backed textbook-style editing.
- Mode separation is intentional:
  - `Calculate` for general scalar/expression evaluation
  - `Equation` for solve workflows
  - domain cores for Geometry, Trigonometry, and Statistics
- Geometry, Trigonometry, and Statistics use the shared core-mode pattern:
  - one top executable draft/editor
  - guided menus and forms below
  - explicit transfers instead of implicit fallback into `Calculate`
- Guide is a top-panel utility, not a launcher app.
- Active runtime shell:
  - `src/App.tsx` is now the import shell (`App.css` + `AppMain`)
  - `src/AppMain.tsx` hosts orchestration/runtime rendering
  - `src/App.css` remains the import manifest over `src/styles/app/*`
- Extracted `src/app/*`, `src/styles/app/*`, and decomposition facades under solver/guide/types are in-tree and passing regression.

## Most Recent Completed Milestone
- Completed Exact Algebra Core `R3` as bounded rational and radical equation solving in `Equation > Symbolic`:
  - added a guarded algebra-transform stage for exact LCD clearing, radical isolation, and bounded conjugate transforms
  - solved supported rational equations by clearing LCDs while preserving original exclusions
  - solved supported radical equations through exact isolation + power transforms with candidate validation against the original equation
  - added `LCD Clear`, `Radical Isolation`, and `Conjugate Transform` provenance badges
  - extended browser-first automation with Equation R3 coverage, closed the gate through `npm run test:gate`, and executed the R3 browser-driven checklist pass
- Regression checks:
  - `npm run test:gate`

## Recent Verified Context
- Workflow docs now include `docs/workflow/cloud-local-sync-reference.md` as the quick handoff checklist between cloud and local VS Code sessions.
- Solver-side and type/content decomposition work from Track `R` is present under:
  - `src/lib/equation/{substitution,guarded}/*`
  - `src/lib/trigonometry/rewrite/*`
  - `src/lib/guide/content/*`
  - `src/types/calculator/*`
- App shell imports now resolve through `src/App.tsx` -> `src/AppMain.tsx` with shared styles via `src/App.css`.
- Exact Algebra Core `R1` is shipped:
  - added bounded app-owned rational normalization under `src/lib/symbolic-engine/rational.ts`
  - wired `Calculate > Simplify` and `Calculate > Factor` to combine/factor supported exact rational forms
  - wired `Equation > Symbolic` to normalize rational structure before solve, carry denominator exclusions, and reject excluded finite roots
  - rendered exclusion constraints as a second exact line in the result area
- Exact Algebra Core `R2` is shipped:
  - added bounded app-owned radical normalization under `src/lib/symbolic-engine/radical.ts`
  - wired `Calculate > Simplify`, `Factor`, and `Expand` to normalize supported radicals exactly
  - wired `Equation > Symbolic` to normalize supported radicals before solve, preserve radical-domain / denominator conditions, and reject invalid finite roots
  - kept radical work bounded to normalization + solve prep only, with no new radical-equation solve family in this milestone
- Track `D3` is shipped:
  - bounded regression/correlation diagnostics inside the existing Statistics screens
  - `Quality Summary` detail sections with residual-size metrics and strength notes
  - balanced low-sample and weak/moderate fit warnings without expanding into prediction or inferential regression
- Track `QA1` is shipped:
  - `src/AppMain.tsx` and shared editor/result surfaces now expose stable non-user-facing test ids
  - `src/test/*` provides jsdom setup and `AppMain` render helpers
  - `e2e/*` provides browser smoke helpers and one critical path per core mode
  - milestone verification is now expected to run through `npm run test:gate`
- Exact Algebra Core `R3` is shipped:
  - `Equation > Symbolic` now performs bounded rational LCD-clearing solves and bounded radical isolation / nth-power solving through the guarded backend
  - candidate validation now marks transformed symbolic outcomes as `Candidate Checked`
  - bounded square-root-binomial conjugate families are recognized inside the algebra stage and either solve through the shared backend or fail with controlled messaging
  - UI integration and browser smoke now include an Equation rational solve path that exercises `LCD Clear`
- Repo line endings are now governed by `.gitattributes`:
  - LF for source, docs, and config text
  - CRLF only for Windows-native scripts

## Current Known Risks
- `src/AppMain.tsx` remains large; further decomposition should continue behind strict parity gates.
- Local-minimum numeric recovery thresholds may need tuning on edge functions with shallow minima.
- Some Compute Engine rule checks still print noisy stderr warnings during tests, even though assertions pass.
- Browser-first automation does not cover Tauri-shell-specific behavior yet; desktop-shell automation remains deferred behind the stronger repo-owned browser gate.
- Broader log transforms (`ln(u)-ln(v)`, ratio/power forms) remain intentionally out of bounded scope and should keep explicit unsupported messaging.
- Bounded trig sum-to-product currently covers two-term `sin/cos` forms only; broader harmonic families remain deferred.
- Statistics inference is intentionally bounded to one-sample mean workflows only; no proportion/categorical inference is in scope yet.
- Statistics still has no prediction UI, residual table, outlier/leverage tooling, or inferential regression; D3 stayed bounded to quality summaries only.
- Calcwiz now has bounded app-owned rational/radical normalization plus first-pass rational/radical equation solving, but it still lacks the broader CAS-grade algebra stack:
  - explicit transform UX and provenance controls beyond current badges/summaries
  - broader denominator-domain tracking
  - wider conjugate / rationalization coverage
  - repeated or nested radical-clearing families
  - broader rational/radical solve breadth beyond the current bounded families
- Exact Algebra Core `R1` is intentionally bounded:
  - single-variable exact rational normalization only
  - simple denominator factors only (`v^n`, `av+b`, products/powers)
  - no automatic LCD clearing or broader rational-equation family solving yet
- Exact Algebra Core `R3` is intentionally bounded:
  - single-variable rational/radical equation solving only inside the current guarded-solve surface
  - rational denominator families stay limited to the shipped `R1` support set
  - radical solving stays bounded to one isolated supported radical plus simple square-root conjugate families
  - no repeated unrestricted squaring or theorem-prover-style search
  - no nested denesting or broad polynomial-under-root factorization
- QA1 automation is intentionally bounded:
  - browser-first only
  - smoke-level E2E per core mode, not exhaustive UI coverage
  - jsdom uses a stable MathEditor test stub instead of the full MathLive runtime

## Pending Verification
- Optional desktop smoke pass on the current shell wiring for visual parity confidence beyond automated coverage.
- Keep the Track E manual checklist in parallel:
  - `.memory/research/TRACK-E-MANUAL-VERIFICATION-CHECKLIST.md`
- Track C checklist artifacts:
  - `.memory/research/TRACK-C-P0-P1-MANUAL-VERIFICATION-CHECKLIST.md`
  - `.memory/research/TRACK-C-P2-MANUAL-VERIFICATION-CHECKLIST.md`
- Track D checklist artifact:
  - `.memory/research/TRACK-D-D1-D2-MANUAL-VERIFICATION-CHECKLIST.md`
  - `.memory/research/TRACK-D-D3-MANUAL-VERIFICATION-CHECKLIST.md`
- Exact Algebra Core checklist artifact:
  - `.memory/research/TRACK-ALG-R1-MANUAL-VERIFICATION-CHECKLIST.md`
  - `.memory/research/TRACK-ALG-R2-MANUAL-VERIFICATION-CHECKLIST.md`
- QA1 optional smoke checklist artifact:
  - `.memory/research/TRACK-ALG-R3-QA-MANUAL-VERIFICATION-CHECKLIST.md`

## Next Recommended Task
- Plan Exact Algebra Core `R4` as explicit algebra transform UX/provenance on top of the shipped `R1`/`R2`/`R3` stack.
