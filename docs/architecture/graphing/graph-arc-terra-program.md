# REZANOVA Graphing dependency-driven Terra program

Status: revised 30-move implementation program; Moves 1-24 complete; Move 25 is the active gated milestone
Parent contract: `docs/architecture/graphing/graph-arc-authority-v1.md`
Rule: one named milestone is one reviewed, verified commit unless the user explicitly approves another split.

## Gate policy shared by every milestone

- Start by rebasing the touchlist against current `main` and inspecting the shared checkout. Never stage unrelated work.
- Label each gate `ui` or `backend` and record evidence in its session dossier before commit.
- Run focused affected tests, incremental TypeScript, `npm run test:memory-protocol`, `npm run test:file-sizes`, and `git diff --check`. Use the seam-impact selector and broader gates only when the touched seam requires them.
- Any app-visible graph, label, region, error, evidence card, motion, or export preview requires Playwright inspection of the real app. Record viewport, inputs, expected result, screenshot path, and readability/overflow/context-loss findings.
- The user approved commits for revised Moves 11-14 on 2026-07-19. Each gate still commits only after its focused verification. Push remains separately approval-gated.
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

Status: complete in the verified Move 5 gate.

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

Status: complete in the verified Move 6 gate.

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

Status: complete in the verified Move 7 gate.

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

## 11. `GRAPHING-INTERACTION-SAMPLING-CORRECTION1`

Status: complete in `c9871ecd`.

- Terra: High
- Gate type: ui
- Objective: correct visible interaction and sampling failures before adding more relation families: common high-degree explicit curves must not exhaust on offscreen spans, directed inequalities must use compact geometry, and pan/zoom must transform one complete scene without sampling work during the gesture.
- Allowed: Graph explicit/implicit/directed samplers, request scheduling, SVG reference adapter, viewport controller/styles, Graph performance fixtures/tests/e2e, Graph contracts needed by the renderer frame.
- Forbidden: Canvas, Three.js, solver-private imports, user-facing quality controls, OOE capability changes, analysis, unrelated workspaces.
- Dependencies: implicit regions and the renderer-neutral scene contract.
- Contracts: `GraphRenderFrameV1`; fair per-visible-item work allocation; complete-pass geometry; latest-only preview/settled commit; authored source and `GraphRelationIR` remain unchanged.
- Behavior: the active complete scene transforms once per animation frame; wheel settles at 80ms; viewport preview launches after settlement; revision-old math stays non-traceable and is never presented as current after a settled mathematical failure.
- Tests/evidence: `x^5`, `x^6`, `x=y^5`, `x=y^6`, `y<x`, implicit disk, discontinuity, rapid pan/wheel, native-selection suppression, compact SVG data, stale drop, reduced motion.
- Broad gates: Graph semantic/UI/browser canaries, sample OOE probe, scene snapshots, renderer boundary.
- Stop: correction requires a renderer-owned scene, unrestricted symbolic interval proving, or an app-wide event/scheduler rewrite.
- Deletion: remove React-owned geometry serialization and stale-scene dimming superseded by the imperative SVG adapter.

## 12. `GRAPHING-PIECEWISE1`

Status: verified for its approved commit.

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

## 13. `GRAPHING-PARAMETERS1`

Status: complete in the verified Move 13 gate.

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

## 14. `GRAPHING-POLAR-GRID1`

Status: implementation verified; pre-Three checkpoint remains blocked by the existing eager-main bundle ratchet and unavailable packaged-GUI visual smoke in the Snap VS Code environment.

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

## 15. `GRAPHING-INSTANT-VIEWPORT-CORRECTION1`

- Terra: High
- Gate type: ui
- Objective: make live camera interaction renderer-local and immediate, restore click-first tracing with selected-item sweeping, and expose the existing structured piecewise capability through `+ Add item` before introducing another renderer.
- Allowed: Graph renderer/view contracts, SVG reference adapter, live grid generation, viewport/trace controller, Graph sampling V2 envelope, Graph worker supersession, session-owned piecewise authoring drafts, focused tests/e2e/performance evidence.
- Forbidden: Three.js, Analyze, Complex/Both, Export, persistence, solver authority changes, unrelated workspaces, OOE diagnostics UI.
- Dependencies: the complete Move 14 SVG/scene/sampling foundation and the focused Desmos/GeoGebra recon.
- Contracts: `setView(GraphRendererViewFrameV1)` and `setScene(GraphRendererSceneFrameV1 | null)`; main-thread `GraphGridSceneV2`; geometry-only `GraphSampleRequestV2`/result; one retained Graph worker; screen-space trace index; `GraphPiecewiseAuthoringDraftV1` remains outside `GraphDocumentV1` until atomic validation.
- Behavior: wheel/pan updates the local camera and responsive grid at most once per animation frame, commits React/session state once after settlement, launches no sampling during the gesture, then requests one preview plus one settled refinement. Hover alone does nothing; click acquires the nearest item, subsequent pointer movement sweeps that selected item, and empty click or Escape clears it. `+ Add item` exposes only Piecewise Function and Point Set.
- Completion correction: explicit and parametric routes refine iteratively in screen space without a generic recursion-depth cutoff, retain the finite remainder after finite/non-finite boundary bracketing, and carry ordinary branches truthfully to the visible viewport edge. Long expression rows scroll horizontally only when they overflow while their action controls remain fixed.
- Tests/evidence: realistic 12-event wheel cadence, rapid burst and pan, stable SVG node identity, one viewport commit, retained worker generation, polar origin-offscreen coverage, click acquisition and selected-item sweeping across relation routes, touch/keyboard/reduced-motion behavior, piecewise draft focus/retention/atomic promotion/undo/recovery.
- Broad gates: Graph contracts/sampling/scene/OOE/UI/browser, incremental TypeScript, web bundle/lazy-load ratchets, memory/file-size/diff/seam evidence.
- Stop: interaction needs renderer-owned mathematical truth, a worker per tab/event, or app-shell architecture changes.
- Deletion: remove the combined `GraphRenderFrameV1`, worker-owned grid payload, group-wide SVG reconstruction, narrow click-only tracing, and permanent Point Set button.

## 16. `GRAPHING-ADAPTIVE-VIEWPORT-SAMPLING1`

- Terra: High
- Gate type: backend and ui
- Objective: replace fixed per-item allowances with CSS-pixel viewport-derived preview, settled, and polish quality so ordinary supported graphs are governed by visible accuracy rather than arbitrary depth or equal quotas.
- Contracts: `GraphSampleRequestV3` carries CSS size, revisions, quality, movement, priority, and parameter dependencies; per-item result evidence records achieved quality, estimated screen error, cache disposition, refinability, and truthful stop reason. V2 is removed after migration.
- Policy: preview uses 32px probes, 1.5px midpoint error, and 15-degree turns; settled uses 16px, 0.35px, and 6 degrees; polish targets 0.2px and 3 degrees silently. Implicit levels use complete 32/12/6px grids, while directed regions retain compact clipped geometry.
- Runtime: the retained application worker accepts one active and one latest request, reuses a bounded 16MiB active-tab cache across moderate view changes, clears it on mathematical revision or disposal, prioritizes the active/dependent group after all-item preview, and throttles polish between work slices.
- User behavior: Ready means all visible items have complete current preview geometry. Settled/polish remain silent; physical-resolution or topology failures are per-item reduced-detail/unresolved evidence rather than generic plotting-limit warnings.
- Dependencies: completed Move 15 renderer/view separation and the retained 25-row failure evidence.
- Evidence: the canonical 25-row/10-visible workload passes first preview at 132.4ms, settled at 162.6ms, 4x-throttled p95 frame interval at 16.8ms, no task above 50ms, zero stale commits, and the 20-cycle lifecycle/heap gate. Focused visual evidence confirms smooth `log(sin(x))`, high-degree interaction, directed regions, and polar/parametric views at the required sizes.
- Stop: a proposed policy creates a user-facing mathematical complexity cap, weakens discontinuity/domain safeguards, or hides genuinely incomplete settled geometry.

## 17. `GRAPHING-IMPLICIT-CONTOUR-QUALITY1`

- Terra: High; gate type: backend and ui.
- Objective: replace uniform marching-square fragments with adaptive boundary-cell refinement, safeguarded edge roots, an asymptotic saddle decider, shared vertices, and stitched polylines before any renderer change.
- Evidence: screen-space shape oracles cover circles, translated circles, ellipses, hyperbolas, nonlinear contours, cusps, lemniscates, small loops, non-finite boundaries, and regions; Playwright confirms smooth closed contours in the SVG reference renderer.
- Stop: partial implicit levels become visible, a generic user-facing recursion limit is introduced, or non-implicit routes regress.

## 18. `GRAPHING-NOTES1`

- Terra: High; gate type: backend and ui.
- Objective: introduce Graph document/session V2, separate content and mathematics revisions, geometry-only sample/scene contracts plus renderer presentation frames, plain multiline Note rows, and persisted-row reordering.
- Notes are rail-only, capped at 16,384 characters, undoable, reorderable, and excluded from sampling, tracing, analysis, and viewport export.

## 19. `GRAPHING-PIECEWISE-CONDITION-VALIDATION1`

- Terra: High; gate type: backend and ui.
- Objective: replace fixed-point condition guesses with exact reducible interval partitions plus adaptive current-viewport evidence, shared by diagnostics and branch clipping.
- All matching branches render; `otherwise` covers only unmatched domains; overlaps, gaps, impossible branches, inclusivity, and unresolved evidence remain explicit.

## 20. `APP-SHELL-EAGER-SURFACE-LAZY-BOUNDARY1`

- Terra: High; gate type: backend and ui.
- Objective: split genuinely inactive Formula Viewer, Guide, History, Notebook, and Settings surfaces enough to pass the existing eager raw/gzip/largest-chunk ratchets without raising thresholds or hiding the app behind a fake import.
- Graphing and Three must remain absent from non-Graph startup. Stop for a replan if this requires broad bootstrap reconstruction.

## 21. `GRAPHING-APPEARANCE-STYLING1`

Status: complete in `8fafd717`.

- Terra: High; gate type: ui.
- Objective: restore the compact rendered-cases piecewise resting row and add renderer-neutral Technical/Paper/Aurora/Luminous themes plus per-item color, opacity, width, dash, region opacity, soft halo, label, and semantic-marker commands through `setPresentation()` without resampling.
- Paper changes only the Graph canvas; Luminous remains restrained. Theme and style state is tab-local, undoable, versioned, and preserves custom item overrides without incrementing mathematics revisions.

## 22. `GRAPHING-THREE-RENDERER1`

Status: complete in `b655d02b`.

- Terra: High; gate type: ui.
- Objective: pin audited `three@0.185.1`, widen renderer-neutral scene/camera contracts, and add the private on-demand WebGL2 adapter plus a permanent per-pane 2D/3D switch.
- 2D uses an orthographic planar camera; 3D offers Perspective/Orthographic, Top/Front/Right/Isometric snaps, Unity-compatible pan/orbit/zoom/focus/reset, optional flythrough, equal units, explicit vertical exaggeration, restrained lighting, selection outline, and optional wireframe.
- Existing curves stay on `z=0`. Three types remain private; SVG remains the precise deterministic 2D reference/fallback. Context loss, unavailable WebGL2, resource caps, and disposal are visible and deterministic.

## 23. `GRAPHING-ANALYSIS-OOE1`

Status: complete in `13b89ef7`.

- Terra: High; gate type: backend.
- Objective: add independent `graph.analyze` traffic control and validated V2 evidence for roots/intercepts, extrema, compatible intersections, holes/poles, asymptotes/domain boundaries, and piecewise continuity without importing Equation-private internals.
- Preserve exact-proved, conditional, numeric-validated, sampled-estimate, suspected, inconclusive, and unsupported evidence classes. Only exact or numeric-validated findings may become persistent annotations.
- The Graph-owned analyzer proves degree-at-most-two polynomial facts and structurally recognized real-domain facts, numerically validates bounded roots/intersections and rational poles, and refuses to upgrade denominator exclusions, non-finite samples, or turning samples into stronger claims. Its isolated worker and cooperative fallback have independent cancellation, revisions, diagnostics, runtime probe, and OOE registrations.

## 24. `GRAPHING-ANALYZE-UI1`

Status: implementation and verification complete; commit pending at write time.

- Terra: Medium; gate type: ui.
- Objective: expose a floating, resizable, non-dimming Analyze overlay with Features, Evidence, and Style tabs, tab-local remembered state, hover/focus previews, explicit pins for proven/validated annotations, and explicit recenter actions.
- The overlay does not resize or auto-pan the viewport and reserves an integrated Solve section for Move 26.
- Analysis launches only on overlay opening, selection, or settled mathematics/parameter revision changes. Viewport gestures do not relaunch it; persisted pins use bounded stable identities and sampled estimates remain non-persistable.

## 25. `GRAPHING-REAL-SURFACES1`

- Terra: High; gate type: backend and ui.
- Objective: add explicit structured `z=f(x,y)` relations, bounded adaptive meshes, domain breaks, normals, contours, budget evidence, top-down 2D height/contour rendering, and shaded 3D rendering with optional wireframe.
- Surface trace reports `(x,y,z)`; analysis adds domain boundaries, `z=0` contours, and validated stationary/local-extrema candidates. Implicit and parametric surfaces plus broad surface-surface solving remain deferred.

## 26. `GRAPHING-COMPLEX-MAPPING-SOLVER1`

- Terra: High; gate type: backend and ui.
- Objective: add structured `f: C -> C` mappings for `f(z)=...`, `w=...`, and bare z-expressions, continuous domain coloring, synchronized component maps, real-axis-slice Both mode, visible certified principal cuts/branch points, graph-local assumptions, and bounded exact/numeric complex solving inside Analyze.
- Core mappings include roots, rational/complex powers, logarithms, inverse trig/hyperbolic families, conjugate, Re, Im, magnitude, and argument. Non-holomorphic mappings are explicit. Real-parameterized Argand trajectories remain a separate relation.
- A reviewed domain-neutral complex evaluation/branch seam may be shared with Equation; Graph never imports Equation-private code or silently reinterprets real `x` expressions.

## 27. `GRAPHING-RIEMANN-SHEETS2D1`

- Terra: High; gate type: backend and ui.
- Objective: add a structured `ComplexBranchAddress` vector, finite/all-sheet and bounded infinite-family loading, nearest composed neighbors, a compact sheet strip, certified cut correspondences, and trace-driven analytic continuation.
- Camera movement never changes sheets; loaded-sheet truncation is explicit; domain coloring and all component maps follow the selected address.

## 28. `GRAPHING-RIEMANN-SURFACES3D1`

- Terra: High; gate type: backend and ui.
- Objective: add exploratory 3D Riemann meshes for the selected and adjacent connected sheets with Re/Im/magnitude height modes, phase/magnitude color, reduced adjacent-sheet emphasis, truthful paired seams, branch-transition trace readback, bounded neighborhood loading, and precise 2D fallback.
- Real/Complex/Both panes retain independent mode, camera, projection, and navigation state. No fake geometric bridges are drawn for relationships that cannot be truthfully embedded in 3D.

## 29. `GRAPHING-PRESENTATION-EXPORT1`

- Terra: High; gate type: ui.
- Objective: add Graph Presentation Mode and deterministic renderer-neutral SVG/PNG export with explicit viewport policy, visible-item selection, theme/style/grid/annotation options, transparent backgrounds, bounded PNG sizes, and native/browser Save As paths.
- The live WebGL canvas is never export authority; editable Graph project persistence remains deferred.

## 30. `GRAPHING-ARC-CLOSEOUT1`

- Terra: High; gate type: backend and ui closeout.
- Objective: run the complete Graph semantic/runtime/renderer/analysis/surface/complex/Riemann/export/browser evidence, the canonical performance workload, lifecycle and bundle gates, plus one packaged Linux Graph smoke.
- Stop on any false mathematical claim, stale result, renderer leak, unverified visible output, or protected-system widening.

## Intended visible progression

The first visible release is Move 8, not Three.js: a truthful SVG-backed graph with governed sampling. Relations widen before the production renderer, so Three consumes a mature renderer-neutral scene rather than defining it. Analyze follows evidence authority; explicit real surfaces precede general complex mappings; precise sheet identity precedes exploratory Riemann geometry. This order optimizes for correctness and reversibility while still giving the user a usable plotter early.
