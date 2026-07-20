# REZANOVA Graphing authority contract v1

Status: approved architecture contract; implementation active through the 30-move Graphing program
Milestone: `GRAPH-ARC-REBASE-AND-AUTHORITY-DESIGN1`
Implementation baseline: `76c0c61b`; implementation is complete through the verified Move 7 gate
Date: 2026-07-19

## Scope and outcome

This contract defines the first production Graphing arc. Graphing will be a full-width, non-singleton app-page workspace opened only from Workspace Tabs `+` -> `New Graph`. Every click creates an independent session document named `Untitled Graph`, `Untitled Graph 2`, and so on.

Graphing is not a calculator `ModeId`, side surface, result card, launcher tile, History artifact, Notebook block, Surface Protocol capability, or detached experiment. The first arc has no cross-workspace Open, Send, or Plot action and no durable graph-project persistence.

Moves 2-7 establish production Graph contracts/performance fixtures, the hidden non-singleton workspace runtime, bounded MathLive-to-standard-MathJSON relation classification, the allowlisted evaluator/sampler, transferable scene/headless evidence, and the Graph-owned `graph.sample` worker shell. The public `New Graph` entry, visible page, SVG renderer, and Three.js dependency remain absent.

## Rebased repository authority map

| Authority | Live source | Graphing may consume | Dependency rule |
| --- | --- | --- | --- |
| Workspace kinds and instances | `src/app/runtime/app-page-workspaces.ts`, `workspace-instances.ts`, `workspace-surfaces.ts` | non-singleton page creation, independent instance state, titles, tab action policy | App Runtime owns integration; Graph Core must not import React or App Runtime. |
| Tabs and New Workspace menu | `src/app/runtime/useWorkspaceTabsRuntime.ts`, `useWorkspaceInstancesRuntime.ts`, `src/app/shell/WorkspaceTabs.tsx` | `New Graph` creation and close/cancel behavior | No launcher tile and no calculator-mode retargeting. |
| Active page composition | `src/app/shell/ActiveSurfaceHost.tsx`, `src/AppMain.tsx` | one explicit Graph page branch | Graph page owns its document host; do not turn all app pages into a generic compute framework. |
| Workspace job identity | `src/types/calculator/workspace-instance-types.ts`, `src/app/runtime/workspaceTabJobs.ts` | instance ID/revision, active-job count, tab-close cancellation | Graph is the only app-page kind that receives a runtime context; existing page kinds remain null. |
| OOE traffic control | `src/lib/ooe/runtime-control/runtime-coordinator.ts`, `job-launch/job-contract.ts`, `active-job-registry.ts` | job identity, latest-only commit, cancellation, stale drop, diagnostics/events | OOE governs Graph jobs; its event outbox is evidence, never a command bus. |
| Runtime-shell precedent | `src/lib/ooe/runtime-control/runtime-shell-contract.ts`, `src/lib/modes/runtime-probes/registry.ts` | host/fallback evidence and runtime probes | Graph owns its hosts, request/result envelopes, clients, and fallbacks. Do not widen unrelated workspace pilots. |
| Compartment authority | `src/lib/compartments/manifest.ts`, OOE compartment resolver | a new OOE-backed `graphing` compartment | Graphing paths must not be absorbed into `app-shell`; capability facts use the `graph.` prefix. |
| Input/editor | `src/components/MathEditor.tsx`, MathLive and Compute Engine dependencies | source editing and parsing ingredients | Authored LaTeX is source/provenance only. Graph owns a bounded parser and normalized IR. |
| Standard MathJSON | `src/types/calculator/math-payload-types.ts`, Compute Engine | expression leaves in Graph IR | Input MathJSON is not producer-proven answer MathJSON and must never be mislabeled as such. |
| Domain/range facts | `src/lib/algebra/domain-range-core.ts` public facade | bounded real-domain constraints and interval checks | Public pure contracts may be adopted. Equation-private numeric interval and evidence modules may not be imported directly. |
| Equation evidence | `src/lib/equation/analysis-evidence.ts` | design precedent only | It is Equation-owned and draft/LaTeX shaped; Graph defines its own evidence contract and may consume only reviewed public facts. |
| Canonical results | `src/types/calculator/canonical-result-v2-types.ts`, V3/V4 types, `src/lib/result-contract/producer-v2.ts` | V2 documents for ordinary exact Graph facts; existing V3 angle and V4 special-function exceptions only | No Graph result version and no semantic facts hidden in labels or prose. |
| Answer proof | `src/lib/result-contract/proven-answer-mathjson.ts` | producer-owned proof for Graph-generated exact answer leaves | Do not promote input trees or reparse rendered output. |
| Shared printer | `src/lib/display/printer/index.ts`, `printer.ts` | canonical/visible/plain rendering from validated MathJSON | Graph Core never authors final mathematical LaTeX. |
| Static math UI | `src/components/MathStatic.tsx` | rendered editor/evidence labels after printer output | Rendering is downstream presentation, never authority. |
| Shell motion | `src/app/shell/SideSurfaceHost.tsx`, `src/styles/app/side-surfaces.css` | lifecycle and motion precedent | Analyze stays Graph-owned. Reuse generic presence/tokens only if the implementation proves them applicable; do not rewrite `APP-SHELL-PANEL-MOTION1`. |
| History | History runtime, tickets, replay, and persistence under `src/lib/history*`, `src/app/runtime/*History*` | no result persistence in the first arc | Graph OOE jobs use the active-job registry without reserving History tickets. |
| Notebook | `src/app/shell/NotebookPage.tsx`, `src/app/shell/notebook/`, `src/lib/notebook/` | no first-arc dependency | No graph block, image insertion, send/open action, or schema change. |
| Surface Protocol | `src/lib/surface-protocol/capabilities.ts`, `policy.ts` | none | Its `graphing: false` exclusion remains unchanged. |
| Regression selection | `e2e/canaries/canary-registry.ts`, runtime probes, `tools/seam-impact-registry.mjs`, CI alignment and file-size validators | Graph-specific registration at the gates named below | Registration lands with the behavior it protects, not speculatively in this design gate. |

### Stale assumptions corrected

1. Canonical Result is no longer only V2. V2 remains the default; V3 is solely the approved angle-quantity widening, and V4 solely the approved special-function-expression widening. Graphing does not get a new shortcut.
2. Existing app pages deliberately return no `WorkspaceInstanceRuntimeContext`. Graphing cannot simply reuse that rule; it needs a narrow computed-page exception.
3. Existing app pages resolve to the `app-shell` compartment. Graphing requires its own OOE-backed `graphing` compartment.
4. Existing Equation analysis evidence is not a generic graph-analysis service. It contains Equation-owned classifications and compatibility-shaped fields.
5. `three` is not installed. Its dependency and import boundary belong after the scene snapshot and SVG reference contracts are proven.
6. Surface Protocol explicitly publishes `graphing: false`. It is protected, not a place to register the new page.
7. Tab job cancellation already observes any active OOE job with a workspace instance identity, so Graphing does not need History tickets to cancel jobs on close.

## Ownership and data flow

```text
MathLive editor source (LaTeX source/provenance)
  -> Graph parser (bounded syntax + standard MathJSON expression leaves)
  -> GraphRelationIR / GraphConditionIR
  -> relation classifier
       -> safe evaluator
       -> explicit/implicit/polar sampler
       -> inequality region engine
       -> Graph analysis orchestrator
  -> SampledSceneRuntime
  -> Graph Render Governor
  -> headless validator | SVG adapter | private Three.js adapter
```

Separately:

```text
Graph-owned exact/validated feature evidence
  -> Graph V2 producer adapter + producer-proven standard MathJSON
  -> CanonicalResultDocumentV2
  -> shared printer
  -> MathStatic / Analyze evidence UI / exact annotation label
```

Scene geometry, renderer hit data, formatted LaTeX, and screenshots never flow backward into Graph mathematical authority.

## State and contract definitions

The definitions below are normative TypeScript shapes. Implementation may split them across files but may not weaken their discriminants or mix state planes.

```ts
type GraphDocumentV1 = {
  version: 1;
  documentId: string;
  title: string;
  documentRevision: number;
  items: GraphItemSpecV1[];
};

type GraphSourceV1 = {
  sourceKind: 'mathlive-latex';
  sourceLatex: string;       // authoring/replay source only
  sourceRevision: number;
};

type GraphItemSpecV1 =
  | {
      version: 1;
      kind: 'relation';
      itemId: string;
      source: GraphSourceV1;
      relation: GraphRelationIR;
      visible: boolean;
      presentation: GraphItemPresentationV1;
    }
  | {
      version: 1;
      kind: 'invalid-relation-draft';
      itemId: string;
      source: GraphSourceV1;
      parseStop: GraphStopReason;
      visible: boolean;
      presentation: GraphItemPresentationV1;
    }
  | {
      version: 1;
      kind: 'piecewise';
      itemId: string;
      source: GraphSourceV1;
      piecewise: GraphPiecewiseSpecV1;
      visible: boolean;
      presentation: GraphItemPresentationV1;
    }
  | {
      version: 1;
      kind: 'parameter';
      itemId: string;
      parameter: GraphParameterSpecV1;
      visible: boolean; // controls presentation, never definition activity
    }
  | {
      version: 1;
      kind: 'point-set';
      itemId: string;
      source: GraphSourceV1;
      points: Array<{ x: SerializableMathJson; y: SerializableMathJson }>;
      visible: boolean;
      presentation: GraphItemPresentationV1;
    };
```

`GraphDocumentV1` is session-scoped but versioned. It contains authored source, valid parsed mathematical truth, retained invalid drafts, parameter definitions, item visibility, ordering, and item styling. A source edit atomically replaces its prior valid item with either a newly parsed valid item or an `invalid-relation-draft`; source and IR are never allowed to disagree, and invalid drafts contribute no mathematical definition or stale geometry. It contains no renderer objects, generated curves, analysis cache, viewport pixel size, selected item, drawer state, History ID, Notebook ID, or authored exact-answer LaTeX.

```ts
type GraphSurfaceStateV1 = {
  version: 1;
  viewport: GraphViewportV1;
  viewportRevision: number;
  parameterRevision: number;
  viewPolicy: GraphViewPolicyV1;
  grid: {
    kind: 'cartesian' | 'polar' | 'none';
    major: boolean;
    minor: boolean;
    axisNumbers: boolean;
    angleLabels: boolean;
    unitCircle: boolean;
  };
  expressionRailCollapsed: boolean;
  analyzeOpen: boolean;
  selectedItemId: string | null;
  presentationMode: boolean;
};

type GraphViewportV1 = {
  coordinateSystem: 'cartesian' | 'polar' | 'argand';
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
};

type GraphViewPolicyV1 =
  | { mode: 'real' }
  | { mode: 'complex'; interpretation: 'real-parameterized-argand-trajectory' }
  | {
      mode: 'both';
      interpretation: 'real-parameterized-argand-trajectory';
      layout: 'synchronized-split';
    };
```

`GraphSurfaceStateV1` survives tab switches during the process session but is not mathematical truth and is not a durable project format. Pixel dimensions, pointer state, active gestures, presence phases, worker handles, scene caches, and tracing cursors are transient component/runtime state.

### Relation and condition IR

```ts
type GraphExpressionIR = {
  mathJson: SerializableMathJson;
  freeSymbols: string[];
};

type GraphComparator = '<' | '<=' | '=' | '>=' | '>';

type GraphConditionIR =
  | { kind: 'comparison'; left: GraphExpressionIR; operator: GraphComparator; right: GraphExpressionIR }
  | {
      kind: 'chain';
      operands: GraphExpressionIR[];
      operators: Array<'<' | '<=' | '>' | '>='>;
    }
  | { kind: 'and'; clauses: GraphConditionIR[] }
  | {
      kind: 'interval-membership';
      value: GraphExpressionIR;
      minimum?: GraphExpressionIR;
      maximum?: GraphExpressionIR;
      minimumInclusive: boolean;
      maximumInclusive: boolean;
    }
  | { kind: 'constant'; value: boolean };

type GraphRelationIR =
  | { kind: 'explicit-y'; rhs: GraphExpressionIR; origin: 'authored-relation' | 'bare-expression' }
  | { kind: 'explicit-x'; rhs: GraphExpressionIR }
  | { kind: 'implicit-equality'; left: GraphExpressionIR; right: GraphExpressionIR }
  | {
      kind: 'inequality';
      left: GraphExpressionIR;
      operator: '<' | '<=' | '>' | '>=';
      right: GraphExpressionIR;
    }
  | {
      kind: 'chained-inequality';
      operands: GraphExpressionIR[];
      operators: Array<'<' | '<=' | '>' | '>='>;
    }
  | { kind: 'polar-radius'; radius: GraphExpressionIR; angleSymbol: 'theta' }
  | {
      kind: 'parametric-curve';
      parameterSymbol: string;
      x: GraphExpressionIR;
      y: GraphExpressionIR;
      domain?: GraphConditionIR;
    };

type GraphPiecewiseSpecV1 = {
  version: 1;
  branches: Array<{
    branchId: string;
    relation: GraphRelationIR;
    condition: GraphConditionIR;
  }>;
  otherwise?: GraphRelationIR;
};

type GraphStopReason = {
  code:
    | 'ambiguous-bare-expression'
    | 'unsupported-relation'
    | 'unsupported-operator'
    | 'expression-budget-exceeded'
    | 'unsafe-expression'
    | 'invalid-condition'
    | 'condition-budget-exceeded'
    | 'invalid-parameter'
    | 'cyclic-parameter'
    | 'coordinate-parameter-conflict'
    | 'sampling-budget-exceeded'
    | 'region-topology-inconclusive'
    | 'analysis-unsupported'
    | 'analysis-inconclusive'
    | 'complex-interpretation-unsupported'
    | 'renderer-capability-unavailable'
    | 'export-budget-exceeded';
  path?: string;
  detailCode?: string;
};
```

The parser retains `GraphSourceV1` unchanged and creates the IR. A bare expression with free symbol `x` and no relation is normalized to `explicit-y` with `origin: 'bare-expression'`; a scalar constant becomes a horizontal `y = c`. A bare expression containing only `y`, or both coordinate variables without a relation, is retained as an invalid draft and rejected as ambiguous. The UI asks for `x = ...` or an explicit relation rather than guessing. Bare `x` therefore plots `y = x`; bare `sin(x)` plots `y = sin(x)`. The trailing blank editor row is transient rail state and is not a document item until it becomes nonempty.

The standard MathJSON leaves are Graph input authority, not canonical result leaves. Parser output must be clone-safe, bounded in node count/depth, and restricted to an allowlist of evaluable operators. Assignments, host-language evaluation, arbitrary function execution, and unknown custom operators are controlled stops.

Boolean conditions are deliberately bounded. First-arc intersections use `and` with a committed clause/depth cap. General Boolean algebra, quantifiers, theorem proving, and unbounded condition simplification are unsupported.

### Parameters and presentation

```ts
type GraphParameterSpecV1 = {
  version: 1;
  parameterId: string;
  symbol: string;
  value: number;
  minimum: number;
  maximum: number;
  step: number;
  animation?: { enabled: boolean; direction: 'forward' | 'reverse' | 'alternate'; periodMs: number };
};

type GraphItemPresentationV1 = {
  version: 1;
  colorToken: string;
  stroke: 'solid' | 'dashed';
  strokeWidth: 'thin' | 'normal' | 'strong';
  fillOpacity: number;
  label: 'auto' | 'always' | 'never';
};
```

Parameter IDs, symbols, bounds, step, and current values are document-local truth. The parameter environment is derived once from active parameter items and shared across relations; source expressions are never rewritten on slider movement. Coordinate variables (`x`, `y`, `r`, `theta`, and the selected parametric symbol), reserved constants/functions, local parameters, and unresolved scalar symbols are classified separately. Calculator Variables are never read implicitly. Duplicate symbols, cycles, non-finite bounds, non-positive steps, or a coordinate symbol used as a parameter are controlled stops.

Visibility has one document property. Hidden relations and point sets continue to participate in definition/parameter dependency resolution but contribute no geometry, annotation, tracing target, or default export. Hiding a parameter control never deactivates the parameter binding.

### Analysis contracts

```ts
type GraphAnalysisRequestV1 = {
  version: 1;
  documentId: string;
  documentRevision: number;
  parameterRevision: number;
  itemIds: string[];
  features: Array<
    'root' | 'x-intercept' | 'y-intercept' | 'extremum' | 'intersection' |
    'hole' | 'pole' | 'vertical-asymptote' | 'horizontal-asymptote' |
    'oblique-asymptote' | 'domain-boundary' | 'piecewise-continuity'
  >;
  numericWindow?: GraphViewportV1;
};

type GraphEvidenceLevel =
  | 'exact-proved'
  | 'exact-conditional'
  | 'numeric-validated'
  | 'sampled-estimate'
  | 'suspected'
  | 'inconclusive'
  | 'unsupported';

type GraphFeatureValueV1 =
  | { kind: 'exact'; value: CanonicalMathValueV2 }
  | { kind: 'approximate'; value: number; errorBound?: number };

type GraphAnalysisEvidenceV1 = {
  version: 1;
  evidenceId: string;
  documentId: string;
  documentRevision: number;
  parameterRevision: number;
  itemIds: string[];
  feature: GraphAnalysisRequestV1['features'][number];
  level: GraphEvidenceLevel;
  coordinates?: { x?: GraphFeatureValueV1; y?: GraphFeatureValueV1 };
  relationValue?: GraphFeatureValueV1;
  conditions: CanonicalMathValueV2[];
  basis: {
    source: 'graph-symbolic' | 'reviewed-public-fact' | 'numeric-validator' | 'sampler';
    validator?: string;
    residualBound?: number;
    sampleSceneRevision?: number;
  };
  stopReason?: GraphStopReason;
};
```

This is an internal evidence/cache contract, not a competing user-result document. Exact leaves are producer-owned, proven standard MathJSON with canonical LaTeX as a derived presentation field. When evidence is shown as a mathematical result, a Graph-owned adapter builds a validated `CanonicalResultDocumentV2`; the shared printer produces visible text/LaTeX. Approximate trace coordinates may remain numeric and visibly approximate.

The orchestrator must never equate a denominator exclusion with a vertical asymptote, a non-finite sample with a pole, or a visual turn with a proved extremum. Every classifier records its basis and level. Evidence is never persisted in `GraphDocumentV1`.

### Scene contracts

```ts
type SampledSceneRuntime = {
  sceneRevision: number;
  documentRevision: number;
  viewportRevision: number;
  parameterRevision: number;
  paths: Array<{
    pathId: string;
    itemId: string;
    coordinates: Float64Array; // x0,y0,x1,y1,...
    segmentOffsets: Uint32Array;
    parameterValues?: Float64Array;
    closed: boolean;
    style: GraphItemPresentationV1;
  }>;
  regions: Array<{
    regionId: string;
    itemId: string;
    vertices: Float64Array;
    triangleIndices: Uint32Array;
    boundaryPathIds: string[];
    style: GraphItemPresentationV1;
  }>;
  pointBatches: Array<{
    pointBatchId: string;
    itemId: string;
    coordinates: Float64Array;
    style: GraphItemPresentationV1;
  }>;
  labels: GraphSceneLabelV1[];
};

type SampledSceneSnapshotV1 = {
  version: 1;
  revisions: {
    scene: number;
    document: number;
    viewport: number;
    parameter: number;
  };
  viewport: GraphViewportV1;
  paths: Array<{
    pathId: string;
    itemId: string;
    coordinates: number[];
    segmentOffsets: number[];
    parameterValues?: number[];
    closed: boolean;
    style: GraphItemPresentationV1;
  }>;
  regions: Array<{
    regionId: string;
    itemId: string;
    vertices: number[];
    triangleIndices: number[];
    boundaryPathIds: string[];
    style: GraphItemPresentationV1;
  }>;
  pointBatches: Array<{
    pointBatchId: string;
    itemId: string;
    coordinates: number[];
    style: GraphItemPresentationV1;
  }>;
  labels: GraphSceneLabelV1[];
};

type GraphSceneLabelV1 = {
  labelId: string;
  itemId?: string;
  role: 'axis' | 'tick' | 'relation' | 'feature' | 'trace';
  anchor: { x: number; y: number };
  priority: number;
  mathJson?: SerializableMathJson;
  plainText?: string;
};

type GraphGridSceneV2 = {
  version: 2;
  kind: 'cartesian' | 'polar' | 'argand' | 'none';
  lines: Array<{ lineId: string; role: 'major' | 'minor' | 'axis' | 'spoke'; x1: number; y1: number; x2: number; y2: number }>;
  circles: Array<{ circleId: string; role: 'major' | 'minor'; center: { x: number; y: number }; radius: number }>;
  labels: GraphSceneLabelV1[];
  hysteresisKey: string;
};
```

Runtime arrays are transferable performance data. Stable `pathId`, `regionId`, and `pointBatchId` values make region-boundary references and later hit-testing unambiguous without renderer authority. The snapshot is bounded, deterministic, JSON-safe, sorted by stable IDs, finite-number validated, and suitable for golden tests and SVG export. Neither contains renderer-specific types or objects. Strict inequalities emit open/dashed boundary semantics; inclusive inequalities emit closed/solid semantics. Region triangles and boundary geometry are distinct.

Sampled geometry and its deterministic snapshot contain mathematical geometry only. `GraphGridSceneV2` is renderer-neutral but generated synchronously from the live camera on the main thread at most once per animation frame: Cartesian ticks use `1, 2, 5 x 10^n`, hysteresis, minor subdivisions, and collision budgets; polar grids use adaptive rings/spokes and restrained angle/radial labels even with the origin offscreen. Grid work never enters React, OOE, or the sampling worker. The Unit Circle remains a separate optional sampled teaching overlay.

### Renderer contracts

```ts
type GraphRendererCapabilities = {
  rendererId: 'headless' | 'svg' | 'three-webgl';
  interactive: boolean;
  hitTesting: boolean;
  regionFill: boolean;
  polarGrid: boolean;
  contextRecovery: boolean;
  maximumVertices: number;
};

type GraphRenderPolicy = {
  quality: 'interactive-preview' | 'settled' | 'export';
  reducedMotion: boolean;
  maximumVertices: number;
  maximumLabels: number;
  pixelRatioCap: number;
};

interface InteractiveGraphRenderer {
  readonly capabilities: GraphRendererCapabilities;
  mount(target: HTMLElement): void;
  resize(cssWidth: number, cssHeight: number, devicePixelRatio: number): void;
  setView(frame: GraphRendererViewFrameV1): void;
  setScene(frame: GraphRendererSceneFrameV1 | null): void;
  hitTest(clientX: number, clientY: number): GraphHitResult | null;
  handleContextRestored(): void;
  dispose(): void;
}

type GraphRendererViewFrameV1 = {
  version: 1;
  viewport: GraphViewportV1;
  grid: GraphGridSceneV2;
  policy: GraphRenderPolicy;
};

type GraphRendererSceneFrameV1 = {
  version: 1;
  scene: SampledSceneRuntime;
  sourceViewport: GraphViewportV1;
  policy: GraphRenderPolicy;
};

interface GraphSceneExporter {
  readonly format: 'svg' | 'png';
  export(snapshot: SampledSceneSnapshotV1, request: GraphExportRequestV1): Promise<GraphExportResultV1>;
}

type GraphHitResult = {
  itemId: string;
  sceneRevision: number;
  pathIndex?: number;
  parameterValue?: number;
  world: { x: number; y: number };
  distancePixels: number;
};

type GraphExportRequestV1 = {
  version: 1;
  sceneSnapshotHash: string;
  format: 'svg' | 'png';
  width: number;
  height: number;
  pixelRatio: number;
  background: 'transparent' | 'document';
  visibleItemIds: string[];
  includeAnnotations: boolean;
  budgets: { bytes: number; vertices: number; pixels: number; timeMs: number };
};

type GraphExportResultV1 = {
  version: 1;
  sceneSnapshotHash: string;
  format: 'svg' | 'png';
  width: number;
  height: number;
  mimeType: 'image/svg+xml' | 'image/png';
  bytes: Uint8Array;
  warnings: GraphStopReason[];
};
```

The Render Governor owns adapter selection, capability negotiation, current-scene handoff, quality selection, resize/pixel ratio, reduced motion, context loss/recovery, fallback, and deterministic disposal. It owns no math, parsing, sampling, analysis, source state, or renderer-specific scene model.

The headless adapter validates scene semantics and snapshots. SVG is the deterministic reference renderer and vector export path. Three.js is the first production interactive adapter only after those contracts pass. A ratchet permits `three` imports and types solely under `src/lib/graphing/renderers/three/`; public Graph contracts and React page code may know only `InteractiveGraphRenderer`. Context loss switches to the SVG adapter with a visible non-destructive notice; restoration rebuilds from the current renderer-neutral scene. PNG export may use an isolated export surface but must never scrape the interactive canvas as authority.

## Relation support matrix

| Family | First gate | Route | Trace parameter | First supported conditions/evidence | Explicit boundary |
| --- | --- | --- | --- | --- | --- |
| bare `f(x)` and constant | `GRAPHING-MINIMUM-VISIBLE1` | normalize to explicit-y, safe evaluator, explicit sampler | `x` | real-domain guards; sampled scene | bare `y` or mixed `x,y` is ambiguous and rejected |
| explicit `y=f(x)` | `GRAPHING-MINIMUM-VISIBLE1` | explicit-y sampler | `x` | bounded real-domain constraints; numeric scene | unsupported operators or unbounded expression tree |
| explicit `x=g(y)` | `GRAPHING-RELATION-ROUTES1` | explicit-x sampler | `y` | same bounded conditions | never inverted into `y=f(x)` merely for rendering |
| implicit equality | `GRAPHING-IMPLICIT-REGIONS1` | bounded contour cells + validator | connected contour parameter | viewport-bounded numeric-validated/sampled | no global topology/completeness proof |
| y/x-directed inequality | `GRAPHING-IMPLICIT-REGIONS1` | directed region tessellation | boundary relation parameter | `<, <=, >, >=`; solid/dashed distinction | no symbolic claim that sampled fill is globally complete |
| selected implicit inequality | `GRAPHING-IMPLICIT-REGIONS1` | bounded sign-cell region engine | selected boundary branch | bounded `and` intersections | unsupported if topology budget/validator is inconclusive |
| chained inequality | `GRAPHING-IMPLICIT-REGIONS1` | structured chain -> bounded intersection | boundary-specific | monotone comparator chains | mixed/equality/disjunctive chains stop |
| piecewise | `GRAPHING-PIECEWISE1` | branch relations sampled under structured conditions | relation-specific | bounded comparisons/intervals/and; overlap/gap/impossible checks | no string concatenation or unbounded Boolean simplification |
| parameter definition/sliders | `GRAPHING-PARAMETERS1` | shared parameter environment | relation-specific | numeric finite bounds; latest preview/refine | no implicit Calculator Variable capture or cyclic definition |
| point/point set | `GRAPHING-RELATION-ROUTES1` | exact/numeric point evaluator | point index | finite coordinates | symbolic locus generation deferred |
| polar `r=f(theta)` | `GRAPHING-POLAR-GRID1` | polar sampler | `theta` | bounded parameter domain | implicit polar regions deferred unless separately approved |
| parametric `(x(t),y(t))` | `GRAPHING-POLAR-GRID1` | parametric sampler | declared parameter | bounded interval condition | surfaces and multi-parameter families deferred |
| explicit real surface `z=f(x,y)` | `GRAPHING-REAL-SURFACES1` | bounded adaptive surface sampler | `(x,y)` | domain breaks, normals, contours, stationary/local-extrema candidates | no implicit/parametric surface or broad surface-surface solving |
| real-parameterized complex trajectory | `GRAPHING-COMPLEX-MAPPING-SOLVER1` | domain-neutral complex evaluator -> Argand path | real source parameter | bounded trajectory analysis; independent from complex input-plane maps | never presented as domain coloring |
| complex mapping `f:C -> C` | `GRAPHING-COMPLEX-MAPPING-SOLVER1` | structured complex IR -> tiles/component fields/analyzer | complex input `z` | certified principal cuts, branch points, holomorphic status, bounded exact/local solve evidence | no universal closed-form or false global numerical completeness |
| multivalued complex family | `GRAPHING-RIEMANN-SHEETS2D1` | mapping plus `ComplexBranchAddress` vector | `z` plus branch address | finite/all sheets or budgeted infinite neighborhood; analytic continuation | no uncontrolled Cartesian product or arbitrary cut editing |

Real surface, complex tile, and Riemann mesh contracts remain renderer-neutral and versioned. Persisted pane/camera/overlay/active-sheet state is tab-local; source expressions and authored assumptions are document truth. Every contract widening migrates old versions strictly rather than loosening their validators. Three objects and types never cross a public Graph contract.

## Sampling contract

The sampler works in screen space and preserves explicit discontinuity breaks. Each interval/cell considers midpoint deviation, pixel segment length, finite/non-finite transitions, viewport-relative jumps, curvature/turn angle, known domain-boundary proximity, viewport exit/re-entry, numeric stagnation, sample count, and elapsed budget. Refinement is iterative rather than governed by a generic recursion-depth cutoff; any refinement reason can split, and no angle-only policy is sufficient.

Sampling work is fair per visible item. Each route first produces a complete coarse viewport pass, then spends remaining slices on refinement; ordinary slice completion is internal evidence, not a user-facing mathematical restriction. Coordinate-isolated inequalities use their structured directed route and compact clipped fill rather than a generic full-cell mesh. Generic implicit refinements replace the scene only after a complete resolution pass, so row-major partial regions never appear.

Graph-local parameters are document items. Finite scalar definitions such as `a=2` retain their authored source and compile once into a numeric parameter value; slider-created parameters record that distinct origin and begin at `1` over `-3..3` with step `0.1`. All dependent relations consume one parameter environment in `GraphSampleRequestV3`; Graphing never reads calculator Variables and never rewrites relation source. Slider input is latest-only with at most one sampling request in flight, release requests settled refinement, and animation advances only after the current preview is consumed. Hidden dependent curves emit no geometry, while hidden parameter controls retain their document-local binding.

The renderer has separate `setView(GraphRendererViewFrameV1)` and `setScene(GraphRendererSceneFrameV1 | null)` operations. Pan and zoom keep camera state in imperative refs, transform the last complete overscanned scene and regenerate the live grid once per animation frame, and launch no sampling job during the gesture. Settlement commits the viewport once after 180ms wheel quiet or pointer release, then launches one latest-only preview followed by settled refinement after 120ms idle and cancellable silent polish. Pending/status changes never serialize geometry. Revision-old geometry is non-traceable; a failed viewport refinement may retain the transformed scene as visibly pending, while failed changed document/parameter mathematics clears outdated geometry rather than presenting it as current.

Known domain facts pre-split or exclude intervals but never disable numeric guards. A non-finite transition opens a segment and requires re-entry validation. No line may bridge a suspected discontinuity merely because both endpoints are finite. Results report budget exhaustion and suspected/inconclusive regions rather than hiding missing geometry.

Tracing uses a screen-space index built once per committed scene/view. Hover alone does not acquire a trace. A click near geometry selects the nearest item; subsequent pointer movement sweeps that item until an empty click, Escape, or a camera gesture clears it. Explicit-y traces by x, explicit-x by y, polar by theta, parametric by its parameter, point sets by point identity, and implicit/piecewise paths by indexed nearest position. Pointer movement updates the marker imperatively once per animation frame and never launches OOE or React work. Stale revisions remain non-traceable. A settled trace may request exact analysis separately.

## OOE contract

### Identities and hosts

| Capability | Primary host | Fallback host | Shell |
| --- | --- | --- | --- |
| `graph.sample` | `graph-sampling-worker-runtime` | `graph-sampling-runtime` | `graph-sampling-worker-shell` |
| `graph.analyze` | `graph-analysis-worker-runtime` | `graph-analysis-runtime` | `graph-analysis-worker-shell` |
| `graph.export` | `graph-export-worker-runtime` | `graph-export-runtime` | `graph-export-worker-shell` |

All three resolve to the `graphing` compartment. They use separate hosts because rapid sample cancellation, slower analysis, and memory-bounded export have independent lifecycles and must not terminate one another. The fallbacks run the same Graph-owned pure contracts cooperatively; they are not alternate mathematical authorities.

### Request and result envelopes

`GraphSampleRequestV3` contains version, request/workspace/document identity, a clone-safe classified relation snapshot, parameter environment and document/parameter/viewport revisions, viewport, CSS-pixel dimensions, optional Unit Circle overlay input, quality (`preview`, `settled`, or `polish`), predictive movement, and active/dependent priority. It exposes no caller-authored sample/time/vertex quota. The worker derives route-specific internal safety ceilings from viewport resolution; grid policy and a generic recursion-depth cutoff remain absent. Results repeat identity, revisions, and source viewport; carry per-item achieved quality, estimated screen error, cache reuse, refinability, and stop evidence; and return mathematical `SampledSceneRuntime` transferables plus a deterministic snapshot hash.

Preview completes coarse geometry for every visible item before later quality stages. Settled and polish reuse compiled plans and bounded active-tab geometry/cache evidence, with priority applied only after coarse coverage exists. Explicit, explicit-x, piecewise, polar, and parametric routes use CSS-screen midpoint and turning error; generic implicit routes replace scenes only with complete progressive levels. Straight spans retain safety probes without forcing dense output, directed inequalities keep compact clipped fills, and extremely high-frequency content beyond physical display resolution reports reduced detail per item instead of an arbitrary mathematical limit.

`GraphAnalysisRequestV1` is defined above. The result contains matching document/parameter/request hashes and `GraphAnalysisEvidenceV1[]`. A viewport is included only for explicitly local numeric questions; exact analysis is otherwise viewport-independent.

`GraphExportRequestV1` contains version, scene snapshot hash/revision, format, dimensions, pixel ratio, background, visible item IDs, annotation policy, and hard byte/vertex/pixel/time budgets. Its result contains format, bounded bytes/text, dimensions, scene hash, warnings, and budget evidence. Export does not mutate the interactive scene.

### Revision, cancellation, and cache rules

- Every job receives the Graph page's `WorkspaceInstanceRuntimeContext`; closing or retargeting its tab makes commit illegal and requests cancellation through the existing active-job registry.
- Sampling uses `commitLatestOnly` over document, parameter, and viewport revision. A preview can be replaced only by a matching settled result. Stale results are dropped, never briefly rendered.
- Parameter drag increments `parameterRevision`, schedules budgeted preview sampling, and cancels/invalidates older previews. Pointer-up or debounce settlement launches a settled sample and only then refreshes requested analysis.
- Analysis cache key: normalized relation hash + document revision + parameter revision + requested features + optional numeric window. Exact evidence is not keyed to viewport; sampled/local evidence is.
- Export cache key: deterministic scene snapshot hash + export request. Interactive WebGL state is never a cache key.
- Worker control checkpoints occur at interval/cell batches, analysis feature boundaries, and export chunk boundaries. Cancellation reports terminal evidence and releases transfer buffers/resources.
- Main thread owns source editing, document/surface state, gestures, trace interaction, active renderer, and commit selection. Workers own classified snapshot evaluation, adaptive sampling/regions, Graph analysis, deterministic snapshot construction, and bounded export encoding.
- OOE diagnostics record capability, Graph compartment, workspace instance, revisions/hashes, selected/fallback host, budgets, terminal status, and stale/commit decision. They must not record entire user expressions by default.

## Analyze ownership

The Analyze drawer is Graph-owned state and content. It queries cached/requested `GraphAnalysisEvidenceV1`, and only exact/validated evidence may acquire persistent annotations. The drawer may follow the app-shell presence phases and motion tokens, but it is not a global side surface and does not use the global `sideSurface` ownership state. Features, Evidence, and Style remain Graph tabs. Opening the drawer must not dim or disable the Graph document as though it were a modal.

## Anti-regression contract

Each registration lands with the first behavior that needs it:

- compartment: add `graphing` owned/public/private paths and `graph.` OOE facts; boundary tests reject imports of Graph private internals and Three types;
- runtime probes: one probe for each Graph capability/host/fallback/shell with instance revision and stale-close evidence;
- canaries: add a `graphing` driver only when `New Graph` and a visible plot exist;
- seam selector: Graph Core, Graph renderer, Graph app page, and workspace-instance changes select their focused commands plus current app/runtime/OOE/compartment/UI evidence;
- freshness: register the Graph semantic canary manifest/digest when its runner lands;
- file sizes: normal 1,000/1,500-line caps; split parser, sampler, scene, page, and adapters before baseline exemptions are considered;
- CI alignment: every locally required Graph ratchet must be selected by the seam registry and represented in CI before its gate closes.

Required semantic canaries:

1. `sin(x)` creates a nonempty explicit-y path.
2. `1/x` creates separate branches with no false bridge across zero.
3. `sqrt(x)` has no real path for x < 0.
4. `x=y^2` traces by y and is not silently inverted.
5. `<` and `<=` produce visibly distinct boundary semantics.
6. Piecewise open/closed boundaries and branch conditions survive scene generation.
7. Parameter preview revision N cannot commit after revision N+1.
8. A hidden dependent curve emits no scene geometry while its parameter/definition remains active.
9. Polar angle labels occur on the budgeted selected ring, not every ring.
10. Context loss disposes Three resources and shows the current SVG scene without changing the document.

Piecewise execution consumes the existing structured branch relations and `GraphConditionIR` directly. Guided edits parse each value and condition field independently into structured leaves; the reconstructed cases LaTeX is presentation/provenance only and is never reparsed as authority. Every true branch renders, otherwise covers only unmatched input, overlapping branches remain visible with an ambiguity warning, and semantic open/filled endpoint markers cross the renderer-neutral scene.

## Protected paths and non-goals

Unless a later dedicated prerequisite is approved, Graph milestones must not modify History persistence/replay/tickets, Notebook document/schema/page/publication, Surface Protocol, calculator Variables, existing solver route precedence, canonical-result types/version policy, shared printer authority, app-shell panel-motion behavior, unrelated OOE capability IDs/hosts, release packaging, remote/cloud compute, plugins, or public SDK contracts.

Deferred product work includes cross-workspace Open/Send/Plot, graph projects/persistence/import packages, Notebook graph blocks or media insertion, Surface Protocol exposure, Spreadsheet integration, unrestricted Boolean regions, global topology proofs, implicit/parametric real surfaces, broad surface-surface solving, arbitrary branch-cut editing, unlimited sheet loading, dedicated touchpad gestures, remote graph compute, plugins, and a public SDK.

## Architecture stop conditions

Implementation stops for review if it appears to require a universal solver AST, existing solver-precedence changes, generated-LaTeX authority, a second command bus, History/Notebook changes, renderer types in document/math contracts, unbounded theorem proving, rewriting all app-page runtime behavior, an unreviewed Equation-private import, or claims of universal/global complex solving without bounded evidence. A new shared canonical-result version requires its own approved contract milestone.

## First-arc acceptance boundary

The 30-move arc is complete only when the user can create independent Graph tabs, enter supported real relations, explicit real surfaces, complex mappings, and complex trajectories through structured authority, see truthful adaptive plots/regions/surfaces/sheets, navigate independent 2D/3D panes, trace and analyze evidence-classified features, load bounded branch neighborhoods, and export SVG/PNG—while every job is governed, every stale result is rejected, every scene is renderer-neutral, every incompleteness boundary is visible, and protected systems remain unchanged.
