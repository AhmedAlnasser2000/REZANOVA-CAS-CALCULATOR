# REZANOVA Graphing dependency-driven Terra program

Status: approved 19-move implementation program; Moves 1-4 complete, Move 5 next
Parent contract: `docs/architecture/graphing/graph-arc-authority-v1.md`
Rule: one named milestone is one reviewed, verified commit unless the user explicitly approves another split.

## Gate policy shared by every milestone

- Start by rebasing the touchlist against current `main` and inspecting the shared checkout. Never stage unrelated work.
- Label each gate `ui` or `backend` and record evidence in its session dossier before commit.
- Run focused affected tests, incremental TypeScript, `npm run test:memory-protocol`, `npm run test:file-sizes`, and `git diff --check`. Use the seam-impact selector and broader gates only when the touched seam requires them.
- Any app-visible graph, label, region, error, evidence card, motion, or export preview requires Playwright inspection of the real app. Record viewport, inputs, expected result, screenshot path, and readability/overflow/context-loss findings.
- The user approved commits for Moves 1-13 on 2026-07-19. Each gate still commits only after its focused verification. Push remains separately approval-gated.
- Every gate updates `.memory/current-state.md`, the daily journal, its session dossier, and `.memory/decisions.md` or `.memory/open-questions.md` when the gate locks or leaves a durable choice.
- Delete scaffolding, compatibility bridges, duplicate contracts, provisional SVG-only branches, debug flags, abandoned workers, and temporary fixtures in the same gate that supersedes them. Do not retain a second runtime path “for safety.”
- Stop whenever the parent architecture's stop conditions are reached.

## 1. `APP-SHELL-UTILITY-OVERLAY-FIX1`

Status: complete in `133afdf2`.

- Terra: Medium
- Gate type: ui
- Objective: complete the already-audited non-modal utility-overlay correction before Graphing page work, so Settings/History/Variables/Menu no longer dim desktop content and motion is reassessed after backdrop removal.
- Allowed touchlist: `src/styles/app/side-surfaces.css`, focused `SideSurfaceHost`/AppMain UI tests, narrow/wide Playwright specs, its memory dossier.
- Forbidden: Graphing, OOE diagnostics, panel presence lifecycle, History/Settings/Variables content, workspace menus, public APIs.
- Dependencies: `APP-SHELL-PANEL-MOTION1`, `APP-SHELL-RESPONSIVE-AUDIT0`; rebase after the current shared CSS work commits.
- Contracts: preserve existing presence phases and overlay/outboard ownership; use a transparent/light non-modal click-catcher policy with narrow fallback verified visually.
- Behavior: removes heavy dimming; timing changes only if evidence after backdrop removal still shows sluggishness.
- Tests/evidence: existing close, rapid reopen, responsive presentation, reduced motion; 1440/1920/2560 desktop plus narrow overlay at supported UI scales.
- Broad gates: app runtime/UI seam evidence selected by touched files.
- Stop: any need to change focus trapping, global modal policy, OOE diagnostics, or Graphing.
- Deletion: remove obsolete dark-backdrop declaration if replaced; do not retain competing desktop rules.

## 2. `GRAPHING-CONTRACT-PERFORMANCE-FOUNDATION1`

Status: complete in the verified Move 2 gate.

- Terra: High
- Gate type: backend
- Objective: implement exact versioned document, source, relation, condition, piecewise, parameter, surface, viewport, revision, sampling, scene, renderer, stop-reason, and performance-budget contracts with validators and goldens; no visible page.
- Allowed: new `src/lib/graphing/contracts/`, focused tests, `docs/architecture/graphing/`, compartment manifest/validator additions, Graph-specific test scripts and seam registration.
- Forbidden: React page, app-page registration, workers, Three.js/package changes, History, Notebook, Surface Protocol, solver-private imports.
- Dependencies: approved authority contract.
- Contracts: all pre-Three normative v1 types; clone/depth/node/finite-number/cap validators; source-LaTeX/provenance separation; scene snapshot determinism; the 25-row/10-visible workload fixture; and Three/import/compartment/seam ratchets. Analysis and export remain documentation only.
- Behavior: none.
- Tests: round-trip validation, malformed/cyclic/oversize rejection, stable snapshot ordering/hash, renderer-type isolation, no `exactLatex` authority fields.
- Playwright: not required; no visible change.
- Broad gates: compartment, file-size, Graph contract ratchet, seam alignment.
- Stop: standard MathJSON cannot represent a required input expression leaf or a renderer type leaks into contracts.
- Deletion: remove any exploratory duplicate contracts before commit.

## 3. `GRAPHING-WORKSPACE-RUNTIME1`

Status: complete in the verified Move 3 gate.

- Terra: High
- Gate type: backend
- Objective: add the honest non-singleton `graphing` app-page identity and Graph-only runtime-context exception without exposing `New Graph` yet.
- Allowed: `app-page-workspaces.ts`, workspace instance/surface/runtime modules and tests, Graph page shell placeholder behind an internal test path, compartment/runtime context tests.
- Forbidden: calculator `ModeId`, launcher, History/Notebook/Surface Protocol, graph math, workers, general app-page framework rewrite.
- Dependencies: contract foundation.
- Contracts: `GRAPHING_PAGE_WORKSPACE_KIND`; `workspaceInstanceRuntimeContext()` returns context for Graphing only; compartment `graphing`; tab policy allows close/rename/stop, with duplicate/clear deferred until exact document semantics exist.
- Behavior: no user-visible menu entry.
- Tests: independent IDs/titles (`Untitled Graph`, numbered successors), state isolation, Graph runtime context, existing app pages still null, close requests active-job cancellation.
- Playwright: not required; this gate deliberately has no page mount or production entry. The first real visual acceptance begins when Move 8 exposes the production page.
- Broad gates: workspace/app runtime, OOE boundaries, compartment boundaries, canary baseline, UI.
- Stop: implementation requires changing Guide/Settings/History/Notebook runtime identity.
- Deletion: remove test-only mount hook when the public page entry lands.

## 4. `GRAPHING-PARSER-IR1`

Status: complete in the verified Move 4 gate.

- Terra: High
- Gate type: backend
- Objective: parse bounded MathLive source into structured Graph IR and classify explicit-y shorthand safely.
- Allowed: `src/lib/graphing/parser/`, contracts, parser fixtures/tests, public pure input/MathJSON seams.
- Forbidden: solver route precedence, Equation-private parser/evidence/numeric modules, UI, renderer, OOE.
- Dependencies: contract foundation.
- Contracts: allowlisted `GraphExpressionIR`, `GraphRelationIR`, `GraphConditionIR`; trailing source remains intact; symbol-role classification and stop reasons.
- Behavior: none.
- Tests: bare `x`, `sin(x)`, constants; explicit y/x; implicit equality; inequalities/chains; polar; parametric; ambiguous bare y/mixed x-y; malicious/custom/oversize expressions; source round trip.
- Playwright: none.
- Broad gates: Graph contract/parser ratchets, compartment/file size.
- Stop: a universal AST or source-string relation classifier appears necessary.
- Deletion: no compatibility parser or string-regex classifier may remain.

## 5. `GRAPHING-EVALUATOR-SAMPLER1`

- Terra: High
- Gate type: backend
- Objective: build the safe evaluator and cancellable screen-space adaptive sampler with preview/settled quality and hard budgets.
- Allowed: Graph evaluator/sampling directories, public algebra domain-range facade, focused performance/semantic tests.
- Forbidden: React, Three.js, workers/OOE, implicit regions, analysis claims, private solvers.
- Dependencies: parser IR.
- Contracts: evaluator allowlist and budgets; compile-once plans; preview/settled sampling; segment-break reasons; cooperative cancellation.
- Behavior: none.
- Tests: nonempty `sin(x)`, split `1/x`, real-domain `sqrt(x)`, high-frequency/steep/viewport-exit functions, cancellation checkpoints through injected control, and truthful bounded output on budget stops.
- Playwright: none.
- Broad gates: Graph semantic canary runner begins here; file-size/compartment.
- Stop: false discontinuity bridges cannot be bounded without importing Equation-private runtime.
- Deletion: remove naive fixed-step or angle-only prototype samplers.

## 6. `GRAPHING-SCENE-HEADLESS1`

- Terra: High
- Gate type: backend
- Objective: convert sampled output into transferable renderer-neutral scene buffers, deterministic bounded snapshots, and headless semantic evidence.
- Allowed: Graph scene/headless directories and focused snapshot/semantic tests.
- Forbidden: React, SVG UI, Three.js, workers/OOE, analysis, export implementations, private solvers.
- Dependencies: evaluator/sampler.
- Contracts: typed-array ownership, stable path/region/point IDs, finite coordinates, segment offsets, boundary references, stable ordering/hash, labels, and grid scene placeholders.
- Behavior: none.
- Tests: no NaN/Infinity, deterministic hashes, transferability, stable ordering, valid region/path references, malformed index rejection, and deterministic disposal ownership.
- Playwright: none.
- Broad gates: Graph contract/semantic ratchet, compartment, file size.
- Stop: a renderer-specific type or duplicate scene representation becomes necessary.
- Deletion: remove ad hoc sampler-output snapshots once the scene adapter owns conversion.

## 7. `GRAPHING-SAMPLE-OOE1`

- Terra: High
- Gate type: backend
- Objective: make sampling a Graph-owned OOE worker shell with revision-safe commit and cancellation.
- Allowed: Graph OOE pilot/client/worker/entrypoint, OOE plan/host registration, active runtime integration, runtime probes and seam selector.
- Forbidden: generic OOE semantics, unrelated capability IDs/hosts, History tickets, event-command behavior.
- Dependencies: workspace runtime, evaluator/sampler.
- Contracts: `graph.sample`, sample request/result envelope, primary/fallback hosts, Graph compartment facts, latest-only document/viewport/parameter keys.
- Behavior: internal/test-only sampling jobs become governed.
- Tests: worker/fallback parity, structured clone, cancel, stale revision/drop, closed tab/drop, buffer release, diagnostics/event facts, runtime probe.
- Playwright: test-only rapid viewport and close case; no visible graph acceptance yet.
- Broad gates: workspace runtime, runtime probes, OOE/compartment boundaries, Graph ratchet.
- Stop: hard cancellation would terminate unrelated Graph capabilities or jobs lack workspace identity.
- Deletion: remove direct main-thread production sampling call paths; pure fallback remains only through the host contract.

## 8. `GRAPHING-MINIMUM-VISIBLE1`

- Terra: High
- Gate type: ui
- Objective: ship the smallest truthful visible Graph page: `New Graph`, expression rail with trailing blank row, SVG reference viewport, bare/explicit-y plots, visibility, pan/zoom/auto-fit, errors, and independent tabs.
- Allowed: Graph page/components/styles, Workspace Tabs create menu, ActiveSurfaceHost branch, SVG adapter, focused app runtime/UI/e2e/canary files.
- Forbidden: Three.js, Analyze, inequalities, piecewise builder, sliders, History/Notebook/Surface Protocol, top-level Add Expression.
- Dependencies: sample OOE; remove the workspace test-only mount.
- Contracts: controlled document reducer, blank-row focus lifecycle, SVG renderer, view/surface state persistence across tab switches.
- Behavior: users can create multiple Graph tabs and plot `sin(x)`, `1/x`, `sqrt(x)`, and explicit `y=` forms.
- Tests: input/Enter/focus, blank-row invariant, tab isolation/titles, close cancellation, visibility, pan/zoom revisions, errors, keyboard basics, reduced motion.
- Playwright: 1280x800 and wide desktop, multiple tabs, three semantic plots, false-bridge inspection, rail collapse, rapid pan/zoom, reduced motion, light/dark contrast if supported.
- Broad gates: app/workspace runtime, canaries/browser, runtime probes, OOE/compartment, UI, Graph ratchet.
- Stop: visible math labels require generated LaTeX authority or SVG needs its own scene model.
- Deletion: test-only page route and any duplicate local sampling state.

## 9. `GRAPHING-RELATION-ROUTES1`

- Terra: High
- Gate type: ui
- Objective: add explicit-x and finite point/point-set items with relation-correct tracing.
- Allowed: Graph parser/classifier/evaluator/sampler/trace/page tests; Add item point-set entry only.
- Forbidden: implicit contours/regions, analysis drawer, external variable links.
- Dependencies: minimum visible.
- Contracts: explicit-x and point-set scene routes; trace parameter metadata and hit result.
- Behavior: `x=y^2` renders and traces by y; point sets render; pointer tracing uses local scene/evaluator only.
- Tests/evidence: orientation, pan/zoom, branch tracing, point hit target, no pointer-triggered OOE; keyboard alternative for trace selection.
- Broad gates: Graph semantic/UI/browser canaries.
- Stop: renderer hit data becomes mathematical authority.
- Deletion: any x-as-universal trace assumption.

## 10. `GRAPHING-IMPLICIT-REGIONS1`

- Terra: High
- Gate type: ui
- Objective: add viewport-bounded implicit equality contours, directed/selected implicit inequalities, chains, and transparent regions with honest topology limits.
- Allowed: Graph contour/region engine, sampling scene, parser condition routes, SVG/UI/e2e tests.
- Forbidden: unbounded theorem proving, screenshots/CSS clipping, Equation-private solvers, Analyze exact claims.
- Dependencies: relation routes.
- Contracts: cell budgets, boundary semantics, region triangles, validator levels, unsupported/inconclusive stop reasons.
- Behavior: implicit curves and bounded `<, <=, >, >=` regions render; strict/inclusive boundaries differ.
- Tests/evidence: circle/equality, y/x-directed inequalities, implicit disk, chain intersection, strict/inclusive visual distinction, holes/nonfinite cells, budget exhaustion.
- Broad gates: semantic canaries, browser canaries, OOE sample probe, scene snapshots.
- Stop: requested topology cannot be represented honestly within bounded cells/validation.
- Deletion: provisional directed-only special cases duplicated by the region engine.

## 11. `GRAPHING-PIECEWISE1`

- Terra: High
- Gate type: ui
- Objective: add direct structured piecewise parsing and guided branch editing with condition-aware sampling and boundary facts.
- Allowed: Graph piecewise contracts/parser/reducer/UI/scene, condition checker, focused tests/e2e.
- Forbidden: concatenated LaTeX authority, general Boolean solver, calculator Variables.
- Dependencies: implicit/condition engine.
- Contracts: structured branch IDs/order/conditions, add/remove/reorder, open/closed points, overlap/gap/impossible classifications.
- Behavior: direct entry and guided branch rows stay equivalent; curve fragments retain conditions.
- Tests/evidence: branch lifecycle/undo if available, open/closed endpoints, overlap, gap, impossible branch, source preservation, keyboard reorder.
- Broad gates: Graph parser/scene/UI/browser ratchets.
- Stop: a branch condition exceeds the bounded `GraphConditionIR` contract.
- Deletion: temporary branch-fragment-only representation.

## 12. `GRAPHING-PARAMETERS1`

- Terra: High
- Gate type: ui
- Objective: add local parameter discovery, explicit creation, shared sliders, preview/settled sampling, and optional animation.
- Allowed: Graph parameter environment/reducer/controls, sample OOE request, scheduler, tests/e2e.
- Forbidden: calculator Variable reads, source rewriting, global Settings, analysis on every pointer event.
- Dependencies: piecewise and sample OOE.
- Contracts: symbol roles, one parameter environment, numeric bounds/step, parameter revisions, preview/settle policy.
- Behavior: unresolved scalar prompt; Create sliders; synchronized dependent curves; direct input/drag/play.
- Tests/evidence: shared symbol binding, cycles/duplicates/reserved symbols, rapid drag stale drop, settled refinement, hidden curve with active parameter, reduced motion animation policy.
- Broad gates: runtime probe stale case, semantic/UI/browser canaries.
- Stop: non-scalar/symbolic parameter values or external stored-value links are required.
- Deletion: any per-item substituted-source cache.

## 13. `GRAPHING-POLAR-GRID1`

- Terra: High
- Gate type: ui
- Objective: add parametric/polar routes, adaptive Cartesian/polar grids, unit-circle teaching overlay, and relation-correct tracing.
- Allowed: Graph grid/label budget, polar/parametric sampler, Grid & Axes panel, scene/SVG/UI tests.
- Forbidden: 3D, global teaching settings, repeated polar labels, implicit polar regions unless separately reviewed.
- Dependencies: parameters.
- Contracts: grid scene, hysteresis, label priorities, polar/parametric trace metadata.
- Behavior: users can select Cartesian/Polar/None, toggle teaching overlay, and plot `r=f(theta)`/bounded parametric curves.
- Tests/evidence: zoom tick transitions without flicker, collision budgets, one angle-label ring, one radial-label ray, unit circle separation, polar trace.
- Broad gates: semantic/UI/browser canaries, scene goldens.
- Stop: grid labels require renderer-specific layout authority.
- Deletion: any SVG-only tick generator once the scene grid is authoritative.

## 14. `GRAPHING-THREE-RENDERER1`

- Terra: High
- Gate type: ui
- Objective: install Three.js and add the private production interactive adapter behind the established scene/governor contract.
- Allowed: package lock/dependency, `src/lib/graphing/renderers/three/`, governor, import ratchet, renderer-focused e2e/performance tests.
- Forbidden: Three imports/types outside private adapter, Graph document/math changes, Three-owned scene, performance claims without evidence.
- Dependencies: proven headless snapshots/SVG across explicit, implicit, regions, piecewise, parameters, and polar grids.
- Contracts: capability negotiation, buffer lifecycle, context loss/restoration, deterministic disposal, SVG fallback, quality/reduced-motion policy.
- Behavior: interactive default becomes Three when supported; SVG remains fallback/reference/export.
- Tests/evidence: import ratchet, adapter parity against snapshot/SVG, resize/DPR, resource disposal, repeated mount/unmount, forced context loss/restore, unsupported WebGL fallback, visual/performance budgets.
- Broad gates: package/build, Graph renderer ratchet, UI/browser, file sizes, seam/CI alignment.
- Stop: Three-specific types or coordinate transforms leak upstream, or parity cannot be shown.
- Deletion: any provisional production SVG interaction branch superseded by the governor; retain the reference/export adapter.

## 15. `GRAPHING-ANALYSIS-OOE1`

- Terra: High
- Gate type: backend
- Objective: implement the Graph analysis evidence contract, V2 producer adapter, bounded orchestrator, and independent OOE analysis shell before exposing Analyze.
- Allowed: Graph analysis/producer/OOE worker, reviewed public fact adapters, result-contract route registration, probes/tests.
- Forbidden: Equation-private evidence imports, generated-LaTeX truth, canonical-result type widening, History, UI drawer.
- Dependencies: mature relation/sampling routes; producer-proven MathJSON proof path.
- Contracts: evidence levels/features, conditions, basis, `graph.analyze`, cache/revision policy, validated V2 result adapter.
- Behavior: internal analysis available; no user-visible drawer yet.
- Tests: exact root/intercept/extremum where proven, numeric validated intersection, hole vs pole vs asymptote distinction, conditional evidence, sampled/suspected/inconclusive/unsupported, V2 validation and printer parity, stale analysis.
- Playwright: none unless a test-only evidence page is unavoidable; prefer contract tests.
- Broad gates: result contract, V2 enforcement, display inversion, MathJSON coverage, printer migration, runtime probes, OOE/compartment.
- Stop: a feature cannot be represented without a new canonical-result contract or would require changing solver precedence.
- Deletion: Equation-shaped compatibility evidence or string-only exact paths.

## 16. `GRAPHING-ANALYZE-UI1`

- Terra: Medium
- Gate type: ui
- Objective: expose the Graph-owned Analyze drawer, exact/numeric evidence distinction, selected annotations, and Features/Evidence/Style tabs using the approved motion precedent.
- Allowed: Graph Analyze components/styles/state, shared generic motion primitive imports if already suitable, focused UI/e2e.
- Forbidden: global `sideSurface` ownership, app-shell motion changes, modal backdrop, History result cards.
- Dependencies: analysis OOE.
- Contracts: drawer presence, request scheduling, annotation selection, canonical-printer labels.
- Behavior: smooth Analyze open/close; first curve remains visible while slower analysis completes; evidence badges are honest.
- Tests/evidence: enter/exit/reopen, non-interactive exit, reduced motion, stale selection, exact vs approximate labels, overflow/keyboard/focus return, no document dimming.
- Broad gates: Graph/UI/browser plus result/display ratchets if label adapters change.
- Stop: motion reuse requires changing existing shell panel behavior.
- Deletion: test-only analysis surfaces and duplicate label formatting.

## 17. `GRAPHING-COMPLEX-VIEWS1`

- Terra: High
- Gate type: ui
- Objective: add bounded real-parameterized Argand trajectories and synchronized Real/Complex/Both layouts.
- Allowed: Graph complex evaluator/sampler/view layout, scene/governor/UI tests.
- Forbidden: implicit complex-domain coloring, complex input-plane scans, Riemann surfaces, 3D, silent imaginary discard.
- Dependencies: renderer governor and parameter/trace contracts.
- Contracts: GraphViewPolicyV1 exact interpretation, paired scene revisions/view synchronization, complex stop reasons.
- Behavior: supported complex-valued expressions show Argand trajectories; Both shows synchronized real Cartesian and Argand panes.
- Tests/evidence: unit-circle `e^(it)` trajectory, real-only and unsupported cases, view synchronization, trace parameter, resize, labels and accessibility.
- Broad gates: semantic/UI/browser/renderer ratchets.
- Stop: a requested expression has no honest real parameter or needs a broader complex semantic.
- Deletion: any Re/Im rewriting workaround or single-axis Both prototype.

## 18. `GRAPHING-PRESENTATION-EXPORT1`

- Terra: High
- Gate type: ui
- Objective: add Graph-local Presentation Mode and governed deterministic SVG/PNG export.
- Allowed: Graph presentation state, SVG/PNG exporters, export OOE host/client, file-save adapter, tests/e2e.
- Forbidden: Notebook insertion, graph-project save/import, global Settings, canvas screenshot authority.
- Dependencies: stable scene/governor; all visible scene item types.
- Contracts: `graph.export`, explicit dimensions/pixel/byte/vertex/time budgets, visible-item/annotation policy, isolated export surface and cleanup.
- Behavior: presentation collapses Graph chrome temporarily; SVG/PNG export reflects selected visible items and chosen styling.
- Tests/evidence: deterministic SVG, PNG dimensions/transparency, hidden-item exclusion, budget failure, cancel/close, export while context lost, presentation restore, keyboard escape.
- Broad gates: export runtime probe, OOE/compartment, Graph/UI/browser, package/Tauri only if an existing generic save seam truly requires it.
- Stop: export requires Notebook/publication or durable Graph persistence changes.
- Deletion: object URLs, isolated canvases, buffers, and temporary export workers after each job; no screenshot fallback.

## 19. `GRAPHING-ARC-CLOSEOUT1`

- Terra: High
- Gate type: backend and ui closeout
- Objective: prove the complete first-arc boundary, remove provisional routes, align ratchets/CI/freshness, and publish the manual acceptance record.
- Allowed: Graph files, tests/fixtures/ratchets, docs/memory; only proven missing integration seams.
- Forbidden: new feature scope, Notebook/History/Surface, persistence, 3D, remote compute.
- Dependencies: all accepted production gates.
- Contracts: final manifest/digests, no stale scaffolds or forbidden imports.
- Behavior: no new feature; hardening and deletion only.
- Tests/evidence: complete Graph semantic/runtime/browser canaries; targeted affected repo seams; full suites only if blast radius and policy justify a closeout-scale run. Manual matrix covers all locked product decisions at supported desktop widths/scales, reduced motion, WebGL loss, keyboard, export, tab close, and rapid revisions.
- Broad gates: all Graph commands plus memory, file size, diff hygiene, seam/CI/freshness alignment; announce any full Vitest run and cap at four workers.
- Stop: any known false mathematical claim, stale-commit flash, renderer leak, protected-system widening, missing visual evidence, or undeleted provisional path.
- Deletion: every superseded prototype, test-only entry, debug switch, compatibility adapter, and duplicate scene/evaluator/formatter path.

## Intended visible progression

The first visible release is Move 8, not Three.js: a truthful SVG-backed graph with governed sampling. Relations widen before the production renderer, so Three.js consumes a mature renderer-neutral scene rather than defining it. Analyze follows evidence authority, and Complex follows a stable two-view governor. This order optimizes for correctness and reversibility while still giving the user a usable plotter early.
