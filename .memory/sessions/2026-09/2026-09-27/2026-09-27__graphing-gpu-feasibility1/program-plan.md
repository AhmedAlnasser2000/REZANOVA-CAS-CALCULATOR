# Graphing GPU Visual-Evaluation Program (inserted Moves 27–33)

## Context

Codex's Sep 25–27 investigation (thread "Review graphing milestone thread") showed:

- In a matched complex-zoom test, Equation.io updated in ~40 ms and Calcwiz in ~520 ms. Equation.io evaluates each pixel in a WebGL2 shader; Calcwiz evaluates on the CPU in a worker and stretches the result.
- On hard implicit cases, Equation.io is fast but draws false regions.
- Calcwiz's CPU samplers have real bugs, independent of the GPU question.

Code review verdict: **no graphing redesign is needed.**

- The structured expression already lives on the main thread (`classifiedGraphItems`, `src/app/graphing/graph-controller-support.ts:8`).
- The real evaluator compiles to a flat RPN plan (≤512 instructions, `evaluator/compile.ts:154`) that can be translated to GLSL.
- `InteractiveGraphRenderer` already separates `setView` from `setScene`.

What is missing:

- a written authority amendment;
- one additive renderer frame;
- sampler bug fixes, including a **false `exact-proved` branch-point claim** in Analyze;
- a live-viewport gesture model for the complex pane.

Outcome: fast, stable pan/zoom/slider response for field-type graphs and 3D surfaces, without Calcwiz ever claiming mathematics from GPU pixels.

## Decisions (made with the user, 2026-09-27)

| Topic | Decision |
|---|---|
| Authority | **Visual-only GPU.** GPU pixels are display only. Trace, Analyze, export and evidence/unresolved claims come only from the CPU/worker. Nothing is read back from the GPU except in test-only parity checks. |
| Scope | Real 2D fields, complex 2D, and real 3D surfaces. |
| Real 2D | Implicit, inequality and chained-inequality relations go to the GPU. Explicit, polar and parametric curves stay on CPU/SVG but get a gesture-time resample lane. |
| Real 3D | z=f(x,y) is evaluated in a vertex shader over a dense grid inside Three. The CPU mesh is kept for trace, picking, analysis and export. |
| Complex 3D | Design only. The GPU complex evaluator is made 3D-ready and ships with the Riemann surfaces move. |
| Sampler bugs | Fixed first, in Move 28. |
| Deep zoom | Past float32's safe span, switch to the CPU image with a "precise mode" note. No zoom clamp. |
| Fallback | Unsupported operator, no WebGL2 or context loss: use the CPU path and show a small notice. |
| Settled implicit view | The GPU picture stays on screen, drawing only real sign changes under the same domain rules. The CPU runs after settle for evidence. |
| Rollout | Settings → Graphing "GPU rendering: Auto / Off". Each route is enabled by default only after its move passes. |
| Speed acceptance | (a) structural invariants on every machine; (b) adaptive render resolution while moving; (c) budgets recorded on the RTX 5070 Ti and on SwiftShader, which become regression ratchets. |
| Desktop | Automated tauri-driver check. **If the packaged app lacks hardware WebGL2, stop and rethink with the user.** |
| Browsers | Add a Playwright WebKit project alongside Chromium for GPU specs. |
| Roadmap | Insert as new moves and renumber. |
| Branch | Work **directly on `main`**. |
| Attribution | `claude / claude-opus-5-5 / family opus-5.5`, registered in Move 27. |

## Renumbered roadmap

| Move | Milestone | Gate |
|---|---|---|
| 27 | `GRAPHING-GPU-FEASIBILITY1`: attribution, desktop and WebKit probe, benchmark harness, renumber | backend (**stop gate**) |
| 28 | `GRAPHING-SAMPLER-CORRECTNESS1`: implicit partial output, domain-edge cells, affine branch geometry, complex live viewport | ui |
| 29 | `GRAPHING-GPU-FOUNDATION1`: authority amendment, contracts, GLSL translators, governor, setting, parity suite | backend |
| 30 | `GRAPHING-GPU-COMPLEX2D1`: complex domain coloring and components on the GPU | ui |
| 31 | `GRAPHING-GPU-REAL-FIELDS1`: GPU implicit and inequality fields, gesture lane for formula curves | ui |
| 32 | `GRAPHING-GPU-SURFACES3D1`: vertex-shader surfaces in Three | ui |
| 33 | `GRAPHING-GPU-CLOSEOUT1`: matched benchmarks against Equation.io and GeoGebra, ratchets, docs | backend |
| 34–37 | Riemann sheets 2D, Riemann surfaces 3D (on the Move 30 complex evaluator), presentation/export, arc closeout (previously 27–30) | — |

**Working rules:**

- Work directly on `main` in `/home/ahmed/Documents/Calculator`. Other agents also commit there: `main` moved from `89cbc176` to `27b4a7b3` during planning.
- Before each move, check `git status` and `git log`, and leave other agents' uncommitted files alone.
- Stage only this move's paths; never use `git add -A`.
- Each move is one verified commit, made only with user approval, and never pushed.
- Each move follows AGENTS.md:
  - a dossier `.memory/sessions/YYYY-MM/YYYY-MM-DD/<date>__<slug>/` containing `completion-report.md`, `verification-summary.md` and `commit-log.md`, with the manual-steps checklist;
  - updates to the journal, `current-state.md` (refreshed before the first commit of each day) and `decisions.md`.
- Route: **CRITICAL**, since this is an architecture amendment. `approvals.md` records this sequencing approval.
- File cap: 1000 lines for production files. Near-cap files get no net growth: `useGraphWorkspaceController.ts` (969), `GraphWorkspacePage.tsx` (928), `contracts/types.ts` (839), `SettingsPage.tsx` (848). New logic goes into new files.

---

## Move 27: `GRAPHING-GPU-FEASIBILITY1` (stop gate)

**Step 0: attribution.**

- Add family `opus-5.5` to `.memory/PROTOCOL.md` (:29-34, with an approval note dated 2026-09-27) and model `claude-opus-5-5` to the examples (:27).
- Add `'opus-5.5'` to `ALLOWED_AGENT_FAMILIES` in `tools/validate-memory-protocol.mjs:61`, with a test in `tools/validate-memory-protocol.test.mjs`.
- Add a `decisions.md` entry.

**Desktop probe, automated.** The packaged app has never been visually verified; see `.memory/open-questions.md:6`.

- Probe module: `src/lib/graphing/renderers/gpu/probe.ts`, lazily loaded and exposed on a test-only hook. It:
  - reports the renderer and vendor, hardware vs software, `EXT_color_buffer_float`, `EXT_disjoint_timer_query_webgl2`, highp range and precision, and max texture size;
  - renders a test field shader into a float target and reads back a checksum.
- tauri-driver harness:
  - install `tauri-driver` (cargo) and `WebKitWebDriver`, and add them to `tools/check-tauri-linux-deps.mjs`;
  - add a WebdriverIO or Selenium harness in `e2e-desktop/` with a `test:desktop-smoke` script that drives the built `src-tauri/target/release` binary;
  - run in a clean environment: strip `SNAP*` and `LD_LIBRARY_PATH` to avoid the recorded `libpthread` crash;
  - the smoke also confirms the existing Three 3D view mounts, which has never been checked on desktop.
- Environments: Chrome with the RTX, Chrome with SwiftShader, Playwright WebKit, and the packaged app. If acceleration is off, investigate the WebKitGTK DMABUF/compositing environment settings.
- **If the packaged app has no hardware WebGL2, stop and report.** No further moves start.

**Playwright WebKit project.**

- Add a `webkit` project to `playwright.config.ts`, filtered by a `@gpu` tag.
- The CDP-based metrics in `e2e/graphing-performance.spec.ts` stay Chromium-only. GPU specs use CDP-free metrics: rAF timing, `PerformanceObserver`, and draw/compile counters.

**Benchmark harness.**

- Promote `.task_tmp/graph-gpu-bench/measure.mjs` and `measure-equation.mjs` (gitignored) into `tools/graph-bench/`.
- Parameterize the browser path, ports and output directory, and add `test:graph-bench` (non-gating).
- Cases: polynomial, rational, log/root, the three hard implicit cases from the thread, an inequality, complex `log(z)+1/z`, and z=x²+y² with a slider.
- Metrics:
  - first updated frame during a gesture;
  - settle time;
  - frame p95 and long tasks;
  - draws and shader compiles;
  - false or missing geometry, recorded separately.
- Record Calcwiz baselines.
- Mirror run commands come from `playground/sources/metadata/equation-io.yaml` and `playground/sources/GEOGEBRA-LOCAL-COMPARISON.md`.

**Renumber.**

- `docs/architecture/graphing/graph-arc-terra-program.md` (header :3, moves :355-390).
- `graph-arc-authority-v1.md` :5, :14.
- `graph-arc-risk-register.md` :31.
- `.memory/current-state.md` :38.
- `decisions.md`.
- The user-visible text "prepared for Move 28" at `GraphComplexViewport.tsx:141` becomes move-number-free wording.

## Move 28: `GRAPHING-SAMPLER-CORRECTNESS1`

**1. False branch claims (highest priority).**

- Problem:
  - `branchPointsFor` (`analysis/analyze.ts:54-76`) emits `exact-proved` findings (:137-141) located by operator name, so `log(z−1)` "proves" a branch point at 0;
  - `branchGeometry` (`sampling/complex.ts:41-60`) draws the matching wrong cut.
- Fix:
  - add one shared complex-coefficient **affine extractor** (`a·z+b`, handling `Add`, `Subtract`, `Negate`, `Multiply`, `Complex` and numeric leaves) in a new `sampling/complex-branch-geometry.ts`;
  - use it from both `complex.ts` and `analyze.ts`;
  - the branch point is at `−b/a`;
  - when `a` is complex the cut is a rotated ray, clipped to the viewport;
  - for a non-affine argument, emit no point or cut, set `analyticity: 'unknown'`, and add a note;
  - Analyze downgrades anything it cannot place exactly (no `exact-proved`);
  - fix the "principal cut(s)" status wording (`GraphComplexViewport.tsx:109`).
- No contract version bump: `family` is a free string and `'unknown'` already exists (`types.ts:552-553`).

**2. Implicit budget exhaustion goes blank** (`sampling/implicit.ts`).

Root causes:

- `:597-605` and `:620-628` discard everything when the status is not complete.
- Refinement is depth-first and row-major (:470-475), so a partial result would be a finished top band.
- A failed child drops its parent (:462-467).
- `stop()` then blocks the root finding at :487-518 and :548-551.

Fix:

- Refine **breadth-first**, using a priority queue by boundary likelihood.
- On exhaustion, keep the unrefined parent as a leaf.
- Reserve an extraction budget (reusing the 42% reservation idea in `chooseGrid`, :146).
- When out of budget, fall back to linear-interpolation edge roots.
- Return the stitched partial boundaries and regions. `stitchSegments` handles partial sets (:326-333), and `scene/assemble.ts:50` already accepts budget-exhausted paths.
- `request.ts:67-70` already maps partial output to `reduced-detail`, so no change is needed there.
- Split contour extraction into `sampling/implicit-contour.ts` to keep `implicit.ts` well under the cap.

**3. Dropped domain-edge cells.**

- Problem: `makeCell` (:431) requires all 9 points to be finite.
- Fix:
  - add a mixed-cell kind (bounds and finite mask) that subdivides down to `targetBoundaryPixels`, using the size-based stop (:171, :459);
  - `cellMayContainBoundary`'s partly-finite branch (:190) becomes reachable;
  - march only finite sub-cells.
- `topologyInconclusive` (:411) is set only for mixed cells still unresolved at target size, not for every non-finite sample.
- Implement this after the breadth-first change in item 2.

**4. Complex pane live viewport.**

- Problem:
  - `GraphComplexViewport.tsx:130-137` commits the viewport on every pointer move and wheel tick, which bumps `viewportRevision` and launches a preview sample each time (controller :596-607, :815-818);
  - `drawTile` and `pointer()` use `tile.bounds`.
- Fix: adopt SVG's model:
  - a live-viewport ref with rAF drawing;
  - commit on pointer release, or 180 ms after the last wheel event (`WHEEL_SETTLE_MS`);
  - draw the old tile transformed into the live viewport;
  - trace maps through the live viewport.

**Tests.**

- Unit tests:
  - `log(z−1)` gives a point and cut at 1 and no `exact-proved` at 0;
  - `log(2iz+1)` gives a rotated cut;
  - the wide view of `x·y^(sin x−cos x)=y^(3x)` returns partial geometry spread over the whole view;
  - `sin(ln(cos y+x))=0` gives a continuous branch;
  - the circle is unchanged.
- `test:graph-sampling`, `test:graph-contracts`, and the analysis tests.
- Playwright visual checks of those cases at the initial view, after zoom-in and after zoom-out.
- Complex pan and zoom launch no sampling until settle.

## Move 29: `GRAPHING-GPU-FOUNDATION1`

**Authority amendment** (`graph-arc-authority-v1.md` :51-77, :458-545, :578, :614, :621-631, :654-656):

- Define **visual evaluation**: renderer-side numeric evaluation for display only, never an input to trace, Analyze, export, cache keys or evidence.
- Per-frame uniform updates are allowed during gestures.
- Define the scoped gesture-sampling lane for formula curves (Move 31).
- Add the field frame to the renderer contract.

**Contracts.**

- New `contracts/gpu-types.ts`, re-exported from `contracts/index.ts`:
  - `GraphRendererFieldFrameV1`: `{ itemId, route, planId, sourceRevision, program: real-rpn | complex-mathjson, parameters, presentation }`;
  - `InteractiveGraphFieldRenderer.setFieldProgram()`.
- Add the GPU `rendererId` (e.g. `'gpu-field-webgl'`) to the closed sets at `types.ts:502` and `validation.ts:533`.
- Add a strict field-frame validator with tests in `test:graph-contracts`.
- Frames are built on the main thread from `classifiedGraphItems`.

**GPU module and lazy loading.**

- New `src/lib/graphing/renderers/gpu/`, loaded through a new `renderers/gpu-loader.ts` with dynamic `import()`, the same way as `three-loader.ts`.
- `index.ts` exports only the loader, so GPU code stays out of the eager bundle (`tools/report-bundle-size.mjs:10-12`).

**GLSL translators.** These are pure string generators, with no WebGL calls, so `three/` can import them.

- *Real:* `CompiledGraphExpressionPlan` → GLSL.
  - The program cache is keyed like `GraphExpressionPlanCache`, `${planId}@${sourceRevision}`.
  - Parameters become uniforms, so slider changes never recompile.
  - Explicit shims for JS `%` vs GLSL `mod`, negative-base `Math.pow`, `oddIntegerRoot` (`evaluate.ts:17`), division by zero, `Log` with arity 2, and a NaN/Inf domain flag mirroring `evaluate.ts`.
  - An operator whitelist: anything else is a compile refusal, which means CPU fallback plus notice.
- *Complex:* built from the relation MathJSON under a whitelist.
  - Principal log/sqrt/pow/inverse trig matching `createComplexNumericEvaluator`, via the reviewed seam `src/lib/equation/complex-domain-public.ts`, with no Equation-private import.
  - Its output is shaped for reuse by the Riemann surfaces move.

**Governor** (`gpu/field-layer.ts`):

- WebGL2 context, capability probe (from Move 27), program cache.
- Context loss/restore falls back to CPU, reusing the fallback-notice pattern in `GraphViewportHost.tsx:72-79`.
- Precision guard: switch to the CPU image when `span / max(|center|, span)` falls below a threshold set from the probe data.
- Adaptive render scale: an FBO whose resolution drops while moving when the frame time (timer query, or rAF delta) exceeds budget, restored on settle.

**Ratchet** (`tools/graphing-boundary-ratchet.mjs`, with tests):

- A new text rule: `getContext('webgl2'` and `#version 300 es` may appear only under `renderers/gpu/` and `renderers/three/` (Three already calls `getContext`, :92).
- `three/` may import only the pure translator files from `gpu/`.
- Contracts still may not import renderers.

**Setting** ("GPU rendering: Auto / Off"; persisted through Rust so it survives on desktop):

- Rust `Settings` struct and `Default` (`src-tauri/src/lib.rs:75-98`), `SettingsPatch` (~:153), and the patch-apply code (~:1593).
- `settingsSchema` (`schemas.ts` ~:186) and `runtime-types.ts:947`.
- UI in a new `shell/settings/GraphingSettingsPanel.tsx`, patterned on `NotebookSettingsPanel`.
- The graphing library receives the setting as a prop and never imports app state.
- No route is enabled yet.

**Parity suite** (a new `test:graph-gpu` script):

- *Node:* a float32 (`Math.fround`) interpreter of the translated semantics, compared with `evaluate.ts` and the public complex evaluator over randomized grids and edge values (negative bases, cuts, poles, NaN).
- *Browser (Playwright `@gpu`, Chromium and WebKit):* render to an `RGBA32F` target, read back (test only), and compare with the CPU within tolerance. Domain mismatches must be zero apart from documented boundary pixels.

## Move 30: `GRAPHING-GPU-COMPLEX2D1`

- A GPU field canvas replaces the Canvas2D `drawTile` in `GraphComplexViewport.tsx`: domain coloring (standard `phaseColor` and accessible `accessiblePhaseColor`) and the 2×2 component maps.
- The live viewport from Move 28 drives uniforms each rAF.
- Trace calls the CPU complex evaluator at the cursor, through a new graphing-public export; the app does not import `src/lib/equation` directly.
- Branch cuts come from the Move 28 geometry, drawn in the live viewport.
- The CPU tile still runs after settle, for Analyze and as the fallback, but is not displayed while the GPU is active.
- The route is enabled under Auto.
- Acceptance:
  - zero worker jobs and zero shader compiles during a gesture;
  - parity green;
  - complex-zoom benchmark cases recorded on the RTX and SwiftShader, and in Chromium and WebKit;
  - `test:desktop-smoke` passes.

## Move 31: `GRAPHING-GPU-REAL-FIELDS1`

**Layering.**

- Split the SVG renderer mount (`svg/renderer.ts:138-160`) into a grid/labels SVG and a geometry SVG.
- The GPU canvas sits between them, so GPU curves are drawn above the grid and below the CPU curves and points, matching today's stacking.
- The canvas uses `pointer-events: none` and gets its uniforms in `renderView` (`GraphSvgViewport.tsx:142-150`).

**Suppression.**

- The SVG renderer gets a suppressed-item set, applied in `applyPresentation` via `display:none`, for GPU-routed items.
- The trace index is still built from the scene (`GraphSvgViewport.tsx:225-230`).
- The `hasGeometry` empty-state check (:378-380) counts GPU-routed items.

**GPU implicit drawing, two passes.**

- Pass 1: evaluate F = left − right into a float texture with a 1 px margin.
- Pass 2: draw only where finite neighbours show a real sign change, anti-aliased by |F|/|∇F|. This avoids near-zero false bands.

**Other GPU rendering.**

- Inequalities fill where the condition holds and the value is finite.
- Strict boundaries are dashed via a tangent-space phase.
- Presentation (colours, widths, opacity, luminous halo) follows `svg/renderer.ts:285-312`.

**CPU work after settle.**

- The Move 28 CPU sampler still runs for trace, evidence and the "unresolved here" warning.
- Polish runs are skipped for GPU-routed items.

**Gesture lane for formula curves** (new `useGraphGestureSampling.ts`, to keep the 969-line controller from growing):

- Its own sequence and its own gesture-scene slot, where `sourceViewport` is the live viewport.
- It sends only explicit, polar and parametric items, at most one in flight, latest only.
- It stays out of `resultRef`, the pending status and the cache.
- `GraphSvgViewport` gets a throttled live-viewport callback.
- Settled results always replace gesture results.

**Acceptance.**

- The thread's hard cases show no false regions compared with the CPU reference.
- Benchmarks are recorded.
- WebKit and desktop smoke pass.

## Move 32: `GRAPHING-GPU-SURFACES3D1`

- In `renderers/three/renderer.ts`, draw real surfaces as a dense grid using `MeshStandardMaterial.onBeforeCompile`, which keeps lighting, wireframe and selection emissive.
- The vertex shader evaluates z=f(x,y) with the Move 29 real translator, and normals come from finite differences.
- Non-finite vertices collapse into degenerate triangles.
- Grid size is adaptive, up to 384×384 (~147k vertices, below the 350k `maximumVertices`, :51).
- **Picking:**
  - the shader mesh gets a no-op `raycast` and `frustumCulled = false`;
  - the CPU mesh (`sampling/surface.ts`) is an invisible pick proxy for `hitTest` (:291-305), `getItemCenter` (:246-253) and `surfaceTargetAtScreen`.
- Height-ramp min/max come from the CPU mesh as uniforms (:162-170). They are refreshed on settle and may be stale while a slider moves.
- Contours are drawn as a fragment-shader iso-band.
- The domain is `relation.bounds ?? viewport` (`surface.ts:85`), and 3D pan only moves the camera. So acceptance targets **slider and parameter changes** (uniform-only, no worker round trip) and a 60 Hz orbit. The surface-with-slider benchmark is recorded.

## Move 33: `GRAPHING-GPU-CLOSEOUT1`

- Run the harness against Calcwiz (GPU on and off), Equation.io and GeoGebra: cold and warm runs, repeated.
- Report correctness separately from latency.
- Commit the RTX and SwiftShader budgets as ratchets.
- Update the risk register, the authority doc status and `current-state.md`.
- Run `npm run test:gate`, the only time it is run in this program.

## Verification (every move)

- Focused commands:
  - `npm run test:graph-contracts`
  - `npm run test:graph-sampling`
  - `npm run test:graph-scene`
  - `npm run test:graph-ooe`
  - `npm run test:graph-workspace-runtime`
  - `test:graph-gpu`, from Move 29 onward
- `tsc -b`, scoped `eslint`, `npm run test:file-sizes`, `npm run test:memory-protocol`, `npm run test:bundle-size` (Move 29 onward), and `git diff --check`. The boundary ratchet runs via the graph scripts.
- Playwright: real-app visual checks of the move's cases at the initial view, after zoom-in and after zoom-out; `e2e/graphing-performance.spec.ts`; and `@gpu` specs in Chromium and WebKit.
- From Move 30 onward, run `test:desktop-smoke` (tauri-driver) against the packaged build.
- Record the evidence in each move's `verification-summary.md`.
