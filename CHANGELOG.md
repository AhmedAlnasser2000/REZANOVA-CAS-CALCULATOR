# Changelog

All notable user-facing and release-facing changes should be recorded here.

Calcwiz is in early preview. This changelog is intentionally concise and should not imply full CAS parity.

## v0.3.0 - 2026-07-21

A large release covering roughly a month of continuous work across nearly every workspace. Entries below are grouped by product area rather than by commit; internal-only architecture and refactor work (canonical result/MathJSON producer migration, display-contract consolidation, regression-corpus tooling) is omitted except where it changed user-visible behavior.

**Two workspaces are genuinely new** in this release — Graphing and Notebook did not exist at `v0.2.0` (0 files in `src/lib/graphing` and `src/lib/notebook`, and no workspace-host component under `src/app/workspaces`). Everything else below (Equation, Calculus, Linear Algebra, Statistics) was already a working workspace at `v0.2.0` and was substantially expanded, not newly added. Approximate file-count growth in the underlying `src/lib/*` modules, `v0.2.0` → this tag:

| Area | v0.2.0 | Now | Status |
|---|---|---|---|
| Graphing | 0 files | 82 files | New workspace |
| Notebook | 0 files | 88 files | New workspace |
| Equation | 194 files | 321 files | Existing, expanded |
| Calculus | 36 files | 81 files | Existing, expanded |
| Symbolic integration | 6 files | 129 files | Existing, substantially expanded |
| Linear algebra (Matrix/Vector) | 12 files | 90 files | Existing, substantially expanded |
| Statistics | 17 files | 35 files | Existing, expanded |

### Added — Graphing (new workspace)

- Relation-first plotting: explicit `y=f(x)`/`x=g(y)`, implicit equalities, strict/inclusive inequality regions, chained conditions, and structured piecewise relations.
- Document-local symbolic parameters and sliders, per-item visibility controls, and adaptive Cartesian/polar grids.
- Parametric/polar sampling routes and bounded real surfaces.
- A floating Analyze overlay with Graph-owned evidence for roots, intercepts, extrema, intersections, domain features, and asymptotic behavior.
- Real, Complex, and Both view policies, including Argand-plane trajectories, continuous complex domain colouring, and synchronised Re/Im/magnitude/phase component views.
- Graph-local assumptions, principal branch/cut evidence, and bounded exact/numeric complex zero/pole evidence with explicit non-completeness.
- A renderer-neutral scene/render-governor boundary, with exact SVG output for 2D and a private on-demand Three.js/WebGL2 adapter for supported 3D views.

### Enhanced — Equation (existing workspace, expanded)

- Case-sensitive and named-target selection (`@mass`, `var(mass)`), preserving non-target symbols as parameters.
- Guarded direct Cardano/Ferrari cubic and quartic routes, bounded higher-degree symbolic polynomial handling, and periodic trigonometric families.
- Real inequalities, bounded periodic-inequality routes, and 2×2/3×3 systems with broader structured system/readback work.
- Candidate validation with visible exclusions, conditions, domain facts, and branch facts.
- Exact Complex families, bounded complex-region numeric solving (residual, contour, root-count, cluster, derivative, pole-aware, local-box evidence), and branch-safe complex pullbacks that fail closed when principal-branch safety can't be established.

### Enhanced — Calculus (existing workspace, expanded)

- Derivatives (including at a point), partial derivatives, indefinite/definite integral workflows, finite/infinite limits, Taylor/Maclaurin tools, and bounded differential-equation workflows.
- Piecewise/absolute-value limit handling, asymptotic leading-term analysis, and MRV-lite/controlled Gruntz-style limit routes.
- A substantially expanded symbolic-integration subsystem: bounded Risch–Norman ansatz/correction/Hermite-reduction work, bounded Lazard–Rioboo–Trager/Rothstein–Trager-family rational integration, algebraic genus-0/selected genus-1 reductions, elliptic `F`/`E`/`Π`-family output, named special-function output, and proof-backed non-elementary certificates.
- Structural antiderivative verification before a result is accepted, backed by source-tracked integration/limit corpora.

### Enhanced — Linear algebra (Matrix and Vector) (existing workspaces, substantially expanded)

- Numeric/symbolic matrix expressions, exact arithmetic, and bounded conditional symbolic elimination.
- Systems, RREF, rank, nullity, pivots, kernel, image, row/column spaces, and linear-map profiles.
- Determinants, inverses, LU, QR, and multi-right-hand-side solving; coordinates and change of basis.
- Characteristic polynomials, eigenvalues, eigenspaces, diagonalisation, and spectral powers within bounded proof-gated families; definiteness via exact principal-minor analysis.
- Numerical SVD, pseudoinverse, 2-norm condition number, and numerical rank.
- Vector work: Hermitian dot products, norms/units/angles/projections, 3D cross and scalar triple products, Gram–Schmidt orthogonalisation, span/independence classification, and basis selection.

### Enhanced — Statistics (existing workspace, expanded)

- Raw datasets and frequency tables with descriptive statistics and frequency summaries.
- Probability tools with binomial, normal, and Poisson distributions.
- One-sample mean inference, regression/correlation, and relationship-quality summaries.
- Structured answer rows, canonical result documents, and visualization contracts/payloads for result surfaces.

### Added — Notebook (new workspace)

- Rich Tiptap-based authoring: headings, paragraphs, lists, sections, dividers, callouts, and mathematical blocks.
- Page setup, margins, orientation, page breaks, Print Layout, Draft view, headers/footers, and page-number fields.
- Safe local image ingestion with captions, alt text, intrinsic metadata, crop/rotation/size controls, and floating/in-flow placement.
- Outline and Objects & Layers surfaces, templates, persistent preferences, local document library, autosave, revisions, recovery, and Trash flows.
- Lossless `.cwiznb` document packages, export-only PDF/DOCX, offline Web publication projections, and schema-compatible durable document generations.
- Video support was removed after the earlier implementation proved unreliable; image/object interaction is mid-migration to a single object-frame authority.

### Changed — App shell and platform (internal architecture)

- Honest lazy-loading boundaries between eager and lazy app surfaces.
- Order of Execution (OOE) governance extended across the new Graph sampling/analysis workloads.
- Canonical Result V2 and MathJSON-based result authority adopted across Calculate, Equation, guided domains, symbolic calculus, and linear algebra result paths (internal, but underlies the evidence/branch/condition surfacing described above).

### Verification

- Preview releases should pass memory protocol, unit tests, UI tests, lint, frontend build, Rust `cargo check`, launch preflight, and Tauri bundle build before publication.

### Known Limitations

- Early public preview, not production-stable software.
- Linux-first packaging path; Windows and macOS remain architectural targets, not first-preview artifact requirements.
- Symbolic behavior is intentionally bounded and should not be described as full Mathematica/Maple-style CAS parity.
- Graphing's Riemann-sheet/surface work, presentation/export closeout, durable graph-project persistence, and cross-workspace "Open in Graph" flows remain pending.
- Notebook video is not supported; the object-frame migration is not complete.
- Statistics remains a desktop/PC-oriented experience.
- Playground and external-compute experiments are not public release features.

## v0.2.0 - 2026-06-22

### Added

- Linux-first preview release path through GitHub Actions.
- MIT license metadata for npm and Tauri package metadata.
- Public repository guardrails including CI, CODEOWNERS, PR templates, issue templates, CONTRIBUTING, and SECURITY.
- First public preview checklist and release process docs.

### Verification

- Preview releases should pass memory protocol, unit tests, UI tests, lint, frontend build, Rust `cargo check`, launch preflight, and Tauri bundle build before publication.

### Known Limitations

- Early public preview, not production-stable software.
- Linux-first packaging path; Windows and macOS remain architectural targets, not first-preview artifact requirements.
- Symbolic behavior is intentionally bounded and should not be described as full Mathematica/Maple-style CAS parity.
- Playground and external-compute experiments are not public release features.
