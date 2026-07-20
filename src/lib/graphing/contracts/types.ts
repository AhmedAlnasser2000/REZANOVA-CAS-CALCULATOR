import type { SerializableMathJson } from '../../../types/calculator/math-payload-types';
import type { CanonicalMathValueV2, CanonicalResultDocumentV2 } from '../../../types/calculator';

export type GraphSourceV1 = {
  sourceKind: 'mathlive-latex';
  sourceLatex: string;
  sourceRevision: number;
};

export type GraphExpressionIR = {
  mathJson: SerializableMathJson;
  freeSymbols: string[];
};

export type GraphComparator = '<' | '<=' | '=' | '>=' | '>';
export type GraphInequalityComparator = Exclude<GraphComparator, '='>;

export type GraphConditionIR =
  | {
      kind: 'comparison';
      left: GraphExpressionIR;
      operator: GraphComparator;
      right: GraphExpressionIR;
    }
  | {
      kind: 'chain';
      operands: GraphExpressionIR[];
      operators: GraphInequalityComparator[];
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

export type GraphRelationIR =
  | {
      kind: 'explicit-y';
      rhs: GraphExpressionIR;
      origin: 'authored-relation' | 'bare-expression';
    }
  | { kind: 'explicit-x'; rhs: GraphExpressionIR }
  | {
      kind: 'implicit-equality';
      left: GraphExpressionIR;
      right: GraphExpressionIR;
    }
  | {
      kind: 'inequality';
      left: GraphExpressionIR;
      operator: GraphInequalityComparator;
      right: GraphExpressionIR;
    }
  | {
      kind: 'chained-inequality';
      operands: GraphExpressionIR[];
      operators: GraphInequalityComparator[];
    }
  | {
      kind: 'polar-radius';
      radius: GraphExpressionIR;
      angleSymbol: 'theta';
      domain?: GraphConditionIR;
    }
  | {
      kind: 'parametric-curve';
      parameterSymbol: string;
      x: GraphExpressionIR;
      y: GraphExpressionIR;
      domain?: GraphConditionIR;
    }
  | {
      kind: 'real-surface';
      z: GraphExpressionIR;
      bounds?: {
        xMin: number;
        xMax: number;
        yMin: number;
        yMax: number;
      };
    }
  | {
      kind: 'complex-mapping';
      inputSymbol: 'z';
      outputSymbol: 'w' | 'f';
      expression: GraphExpressionIR;
      authoredForm: 'function' | 'output-relation' | 'bare-expression';
    }
  | {
      kind: 'complex-trajectory';
      parameterSymbol: string;
      value: GraphExpressionIR;
      domain?: GraphConditionIR;
    };

export type GraphPiecewiseSpecV1 = {
  version: 1;
  branches: Array<{
    branchId: string;
    relation: GraphRelationIR;
    condition: GraphConditionIR;
  }>;
  otherwise?: GraphRelationIR;
};

export type GraphStopReasonCode =
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
  | 'sampling-cancelled'
  | 'region-topology-inconclusive'
  | 'analysis-unsupported'
  | 'analysis-inconclusive'
  | 'complex-interpretation-unsupported'
  | 'renderer-capability-unavailable'
  | 'export-budget-exceeded';

export type GraphStopReason = {
  code: GraphStopReasonCode;
  path?: string;
  detailCode?: string;
};

export type GraphParameterSpecV1 = {
  version: 1;
  parameterId: string;
  symbol: string;
  origin: 'authored-definition' | 'slider-created';
  source?: GraphSourceV1;
  value: number;
  minimum: number;
  maximum: number;
  step: number;
  animation?: {
    enabled: boolean;
    direction: 'forward' | 'reverse' | 'alternate';
    periodMs: number;
  };
};

export type GraphItemPresentationV1 = {
  version: 1;
  colorToken: string;
  stroke: 'solid' | 'dashed';
  strokeWidth: 'thin' | 'normal' | 'strong';
  fillOpacity: number;
  label: 'auto' | 'always' | 'never';
};

export type GraphColorChoiceV1 =
  | { kind: 'token'; token: string }
  | { kind: 'custom'; value: string };

export type GraphItemPresentationV2 = {
  version: 2;
  color: GraphColorChoiceV1;
  stroke: 'solid' | 'dashed' | 'dotted';
  strokeWidth: 'thin' | 'normal' | 'strong';
  strokeOpacity: number;
  regionOpacity: number;
  halo: 'none' | 'soft';
  markers: 'semantic' | 'none';
  label: 'auto' | 'always' | 'never';
};

export type GraphItemPresentation = GraphItemPresentationV1 | GraphItemPresentationV2;

export type GraphItemSpecV1 =
  | {
      version: 1;
      kind: 'relation';
      itemId: string;
      source: GraphSourceV1;
      relation: GraphRelationIR;
      visible: boolean;
      presentation: GraphItemPresentation;
    }
  | {
      version: 1;
      kind: 'invalid-relation-draft';
      itemId: string;
      source: GraphSourceV1;
      parseStop: GraphStopReason;
      visible: boolean;
      presentation: GraphItemPresentation;
    }
  | {
      version: 1;
      kind: 'piecewise';
      itemId: string;
      source: GraphSourceV1;
      piecewise: GraphPiecewiseSpecV1;
      visible: boolean;
      presentation: GraphItemPresentation;
    }
  | {
      version: 1;
      kind: 'parameter';
      itemId: string;
      parameter: GraphParameterSpecV1;
      visible: boolean;
    }
  | {
      version: 1;
      kind: 'point-set';
      itemId: string;
      source: GraphSourceV1;
      points: Array<{ x: SerializableMathJson; y: SerializableMathJson }>;
      visible: boolean;
      presentation: GraphItemPresentation;
    };

export type GraphDocumentV1 = {
  version: 1;
  documentId: string;
  title: string;
  documentRevision: number;
  items: GraphItemSpecV1[];
};

export type GraphNoteItemV1 = {
  version: 1;
  kind: 'note';
  itemId: string;
  text: string;
};

export type GraphItemSpecV2 = GraphItemSpecV1 | GraphNoteItemV1;

export type GraphDocumentV2 = {
  version: 2;
  documentId: string;
  title: string;
  contentRevision: number;
  mathematicsRevision: number;
  items: GraphItemSpecV2[];
};

export type GraphDocumentV3 = {
  version: 3;
  documentId: string;
  title: string;
  contentRevision: number;
  mathematicsRevision: number;
  items: GraphItemSpecV2[];
};

export type GraphAuthoredAssumptionV1 = {
  version: 1;
  assumptionId: string;
  sourceLatex: string;
  sourceRevision: number;
  factKind: 'domain-exclusion' | 'domain-constraint' | 'branch-principal-range' | 'complex-domain-note';
};

export type GraphDocumentV4 = Omit<GraphDocumentV3, 'version'> & {
  version: 4;
  assumptions: GraphAuthoredAssumptionV1[];
};

export type GraphViewportV1 = {
  coordinateSystem: 'cartesian' | 'polar' | 'argand';
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
};

export type GraphViewPolicyV1 =
  | { mode: 'real' }
  | { mode: 'complex'; interpretation: 'real-parameterized-argand-trajectory' }
  | {
      mode: 'both';
      interpretation: 'real-parameterized-argand-trajectory';
      layout: 'synchronized-split';
    };

export type GraphGridPolicyV1 = {
  kind: 'cartesian' | 'polar' | 'none';
  major: boolean;
  minor: boolean;
  axisNumbers: boolean;
  angleLabels: boolean;
  unitCircle: boolean;
};

export type GraphSurfaceStateV1 = {
  version: 1;
  viewport: GraphViewportV1;
  viewportRevision: number;
  parameterRevision: number;
  viewPolicy: GraphViewPolicyV1;
  grid: GraphGridPolicyV1;
  expressionRailCollapsed: boolean;
  analyzeOpen: boolean;
  selectedItemId: string | null;
  presentationMode: boolean;
};

export type GraphAppearanceThemeV1 = 'technical' | 'paper' | 'aurora' | 'luminous';

export type GraphSurfaceStateV2 = Omit<GraphSurfaceStateV1, 'version'> & {
  version: 2;
  appearance: {
    theme: GraphAppearanceThemeV1;
    colorVisionMode: 'standard' | 'color-vision-friendly';
  };
};

export type GraphVector3V1 = { x: number; y: number; z: number };

export type GraphCameraStateV1 = {
  version: 1;
  projection: 'perspective' | 'orthographic';
  orientation: 'free' | 'top' | 'front' | 'right' | 'isometric';
  position: GraphVector3V1;
  target: GraphVector3V1;
  up: GraphVector3V1;
  perspectiveFovDegrees: number;
  orthographicScale: number;
};

export type GraphPaneViewStateV1 = {
  version: 1;
  dimension: '2d' | '3d';
  camera3d: GraphCameraStateV1;
  verticalExaggeration: number;
  wireframe: boolean;
  flythroughEnabled: boolean;
};

export type GraphSurfaceStateV3 = Omit<GraphSurfaceStateV2, 'version'> & {
  version: 3;
  panes: {
    real: GraphPaneViewStateV1;
    complex: GraphPaneViewStateV1;
  };
};

export type GraphAnalyzeTabV1 = 'features' | 'evidence' | 'style';

export type GraphPinnedAnnotationV1 = {
  version: 1;
  annotationId: string;
  feature: GraphAnalysisFeature;
  level: Extract<GraphEvidenceLevel, 'exact-proved' | 'numeric-validated'>;
  itemIds: string[];
  coordinates: { x?: GraphFeatureValueV1; y?: GraphFeatureValueV1 };
};

export type GraphSurfaceStateV4 = Omit<GraphSurfaceStateV3, 'version'> & {
  version: 4;
  analyze: {
    width: number;
    activeTab: GraphAnalyzeTabV1;
    pinnedAnnotations: GraphPinnedAnnotationV1[];
  };
};

export type GraphPinnedAnnotationV2 = Omit<GraphPinnedAnnotationV1, 'version' | 'coordinates'> & {
  version: 2;
  coordinates: { x?: GraphFeatureValueV1; y?: GraphFeatureValueV1; z?: GraphFeatureValueV1 };
};

export type GraphSurfaceStateV5 = Omit<GraphSurfaceStateV4, 'version' | 'analyze'> & {
  version: 5;
  analyze: Omit<GraphSurfaceStateV4['analyze'], 'pinnedAnnotations'> & {
    pinnedAnnotations: GraphPinnedAnnotationV2[];
  };
};

export type GraphComplexDisplayModeV1 = 'domain-coloring' | 'components';

export type GraphSurfaceStateV6 = Omit<GraphSurfaceStateV5, 'version' | 'viewPolicy'> & {
  version: 6;
  viewPolicy:
    | { mode: 'real' }
    | { mode: 'complex'; interpretation: 'complex-mapping' }
    | { mode: 'both'; interpretation: 'complex-mapping'; layout: 'synchronized-split' };
  complex: {
    displayMode: GraphComplexDisplayModeV1;
    searchRegion: { reMin: number; reMax: number; imMin: number; imMax: number } | null;
  };
};

export type GraphRevisionSetV1 = {
  document: number;
  viewport: number;
  parameter: number;
};

export type GraphRevisionSetV2 = {
  mathematics: number;
  viewport: number;
  parameter: number;
};

export type GraphSceneLabelV1 = {
  labelId: string;
  itemId?: string;
  role: 'axis' | 'tick' | 'relation' | 'feature' | 'trace';
  anchor: { x: number; y: number };
  priority: number;
  mathJson?: SerializableMathJson;
  plainText?: string;
};

export type GraphGridLineV2 = {
  lineId: string;
  role: 'major' | 'minor' | 'axis' | 'spoke';
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};

export type GraphGridCircleV2 = {
  circleId: string;
  role: 'major' | 'minor';
  center: { x: number; y: number };
  radius: number;
};

export type GraphGridSceneV2 = {
  version: 2;
  kind: 'cartesian' | 'polar' | 'argand' | 'none';
  lines: GraphGridLineV2[];
  circles: GraphGridCircleV2[];
  labels: GraphSceneLabelV1[];
  hysteresisKey: string;
};

export type GraphScenePathRuntimeV2 = {
  pathId: string;
  itemId: string;
  coordinates: Float64Array;
  segmentOffsets: Uint32Array;
  parameterValues?: Float64Array;
  closed: boolean;
  strokeRole?: 'default' | 'strict-boundary' | 'teaching-overlay';
};

export type GraphSceneRegionRuntimeV2 = {
  regionId: string;
  itemId: string;
  vertices: Float64Array;
  triangleIndices: Uint32Array;
  boundaryPathIds: string[];
};

export type GraphScenePointBatchRuntimeV2 = {
  pointBatchId: string;
  itemId: string;
  coordinates: Float64Array;
  marker?: 'filled' | 'open';
};

export type SampledSceneRuntimeV2 = {
  sceneRevision: number;
  mathematicsRevision: number;
  viewportRevision: number;
  parameterRevision: number;
  paths: GraphScenePathRuntimeV2[];
  regions: GraphSceneRegionRuntimeV2[];
  pointBatches: GraphScenePointBatchRuntimeV2[];
  labels: GraphSceneLabelV1[];
};

export type SampledSceneSnapshotV2 = {
  version: 2;
  revisions: { scene: number } & GraphRevisionSetV2;
  viewport: GraphViewportV1;
  paths: Array<Omit<GraphScenePathRuntimeV2, 'coordinates' | 'segmentOffsets' | 'parameterValues'> & {
    coordinates: number[];
    segmentOffsets: number[];
    parameterValues?: number[];
  }>;
  regions: Array<Omit<GraphSceneRegionRuntimeV2, 'vertices' | 'triangleIndices'> & {
    vertices: number[];
    triangleIndices: number[];
  }>;
  pointBatches: Array<Omit<GraphScenePointBatchRuntimeV2, 'coordinates'> & {
    coordinates: number[];
  }>;
  labels: GraphSceneLabelV1[];
};

export type GraphRendererCapabilities = {
  rendererId: 'headless' | 'svg' | 'three-webgl';
  interactive: boolean;
  hitTesting: boolean;
  regionFill: boolean;
  polarGrid: boolean;
  contextRecovery: boolean;
  maximumVertices: number;
};

export type GraphRenderPolicy = {
  quality: 'interactive-preview' | 'settled' | 'export';
  reducedMotion: boolean;
  maximumVertices: number;
  maximumLabels: number;
  pixelRatioCap: number;
};

export type GraphRendererViewFrameV1 = {
  version: 1;
  viewport: GraphViewportV1;
  grid: GraphGridSceneV2;
  policy: GraphRenderPolicy;
};

export type GraphRendererSceneFrameV1 = {
  version: 1;
  scene: SampledSceneRuntimeV2;
  sourceViewport: GraphViewportV1;
  policy: GraphRenderPolicy;
};

export type GraphSurfaceMeshRuntimeV1 = {
  meshId: string;
  itemId: string;
  positions: Float64Array;
  triangleIndices: Uint32Array;
  normals: Float32Array;
  contourCoordinates: Float64Array;
  contourOffsets: Uint32Array;
  truncated: boolean;
};

export type GraphComplexDomainTileRuntimeV1 = {
  tileId: string;
  itemId: string;
  width: number;
  height: number;
  bounds: { reMin: number; reMax: number; imMin: number; imMax: number };
  rgba: Uint8Array;
  values: Float32Array;
  analyticity: 'holomorphic' | 'non-holomorphic' | 'unknown';
  branchCuts: Array<{ family: string; from: { re: number; im: number }; to: { re: number; im: number } }>;
  branchPoints: Array<{ family: string; z: { re: number; im: number } }>;
  truncated: boolean;
};

export type GraphSpatialSceneRuntimeV1 = {
  version: 1;
  planarScene: SampledSceneRuntimeV2;
  surfaceMeshes: GraphSurfaceMeshRuntimeV1[];
};

export type GraphSpatialSceneRuntimeV2 = Omit<GraphSpatialSceneRuntimeV1, 'version'> & {
  version: 2;
  complexTiles: GraphComplexDomainTileRuntimeV1[];
};

export type GraphRendererSceneFrameV2 = {
  version: 2;
  scene: GraphSpatialSceneRuntimeV1;
  sourceViewport: GraphViewportV1;
  policy: GraphRenderPolicy;
};

export type GraphRendererSceneFrameV3 = {
  version: 3;
  scene: GraphSpatialSceneRuntimeV2;
  sourceViewport: GraphViewportV1;
  policy: GraphRenderPolicy;
};

export type GraphRendererSceneFrame = GraphRendererSceneFrameV1 | GraphRendererSceneFrameV2 | GraphRendererSceneFrameV3;

export type GraphRendererCameraFrameV1 = {
  version: 1;
  camera: GraphCameraStateV1;
  verticalExaggeration: number;
  wireframe: boolean;
  selectedItemId: string | null;
};

export type GraphRendererPresentationFrameV1 = {
  version: 1;
  contentRevision: number;
  items: Array<{ itemId: string; presentation: GraphItemPresentation }>;
};

export type GraphRendererPresentationFrameV2 = {
  version: 2;
  contentRevision: number;
  theme: GraphAppearanceThemeV1;
  colorVisionMode: 'standard' | 'color-vision-friendly';
  items: Array<{ itemId: string; presentation: GraphItemPresentation }>;
};

export type GraphRendererPresentationFrame =
  | GraphRendererPresentationFrameV1
  | GraphRendererPresentationFrameV2;

export type GraphHitResult = {
  itemId: string;
  sceneRevision: number;
  pathIndex?: number;
  pointIndex?: number;
  parameterValue?: number;
  world: { x: number; y: number; z?: number };
  distancePixels: number;
};

export interface InteractiveGraphRenderer {
  readonly capabilities: GraphRendererCapabilities;
  mount(target: HTMLElement): void;
  resize(cssWidth: number, cssHeight: number, devicePixelRatio: number): void;
  setView(frame: GraphRendererViewFrameV1): void;
  setScene(frame: GraphRendererSceneFrame | null): void;
  setPresentation(frame: GraphRendererPresentationFrame): void;
  hitTest(clientX: number, clientY: number): GraphHitResult | null;
  handleContextRestored(): void;
  dispose(): void;
}

export interface InteractiveGraph3dRenderer extends InteractiveGraphRenderer {
  setCamera(frame: GraphRendererCameraFrameV1): void;
  getItemCenter(itemId: string): GraphVector3V1 | null;
  screenToPlane(clientX: number, clientY: number, z?: number): GraphVector3V1 | null;
  showPivot(pivot: GraphVector3V1): void;
}

export type GraphRendererLifecycleCallbacksV1 = {
  onContextLost: () => void;
  onContextRestored: () => void;
};

/** Internal sampler guardrails. These are derived from the live view, never authored by users. */
export type GraphSamplingLimitsV2 = {
  maximumSamples: number;
  maximumTimeMs: number;
  maximumVertices: number;
};

export type GraphSamplingQualityV3 = 'preview' | 'settled' | 'polish';

export type GraphSamplingPriorityV1 = {
  activeItemId?: string;
  dependentItemIds: string[];
};

export type GraphSamplingMovementHintV1 = {
  panVelocityX: number;
  panVelocityY: number;
  zoomRatio: number;
};

export type GraphPiecewiseConditionEvidenceV1 = {
  version: 1;
  independentSymbol: 'x' | 'y';
  basis: 'exact-global' | 'adaptive-current-viewport' | 'mixed' | 'unresolved';
  validatedInterval: { minimum: number; maximum: number; tolerancePixels: number };
  branchApplicability: Array<{
    branchId: string;
    status: 'applicable-global' | 'applicable-current-viewport' | 'offscreen'
      | 'impossible-global' | 'impossible-current-viewport' | 'unresolved';
  }>;
  overlapBranchPairs: Array<{
    branchIds: [string, string];
    scope: 'global' | 'current-viewport';
  }>;
  uncoveredGaps: Array<{
    minimum: number;
    maximum: number;
    minimumInclusive: boolean;
    maximumInclusive: boolean;
  }>;
  boundaries: Array<{
    value: number;
    includedBranchIds: string[];
    excludedBranchIds: string[];
  }>;
  unresolvedBoundaryCount: number;
};

export type GraphSamplingItemEvidenceV1 = {
  itemId: string;
  route: GraphRelationIR['kind'] | 'piecewise' | 'point-set' | 'unit-circle';
  achievedQuality: 'coarse' | 'settled' | 'polished' | 'reduced-detail' | 'unresolved';
  estimatedMaximumErrorPixels: number;
  cache: 'miss' | 'reused' | 'extended';
  refinable: boolean;
  stopReason?: GraphStopReason;
  piecewiseCondition?: GraphPiecewiseConditionEvidenceV1;
};

export type GraphClassifiedItemSnapshotV2 = {
  [Kind in Extract<GraphItemSpecV1['kind'], 'relation' | 'piecewise' | 'point-set'>]:
    Omit<Extract<GraphItemSpecV1, { kind: Kind }>, 'presentation'>
}[Extract<GraphItemSpecV1['kind'], 'relation' | 'piecewise' | 'point-set'>];

export type GraphSampleRequestV4 = {
  version: 4;
  requestId: string;
  workspaceInstanceId: string;
  documentId: string;
  revisions: { scene: number } & GraphRevisionSetV2;
  items: GraphClassifiedItemSnapshotV2[];
  parameterEnvironment: Record<string, number>;
  viewport: GraphViewportV1;
  cssSize: { width: number; height: number };
  overlays: { unitCircle: boolean };
  quality: GraphSamplingQualityV3;
  priority: GraphSamplingPriorityV1;
  movement: GraphSamplingMovementHintV1;
};

export type GraphSampleResultV4 = {
  version: 4;
  requestId: string;
  workspaceInstanceId: string;
  documentId: string;
  revisions: { scene: number } & GraphRevisionSetV2;
  viewport: GraphViewportV1;
  quality: GraphSamplingQualityV3;
  status: 'complete' | 'partial' | 'cancelled';
  scene: SampledSceneRuntimeV2;
  snapshotHash: string;
  stopReasons: GraphStopReason[];
  itemEvidence: GraphSamplingItemEvidenceV1[];
  evidence: {
    sampleCount: number;
    vertexCount: number;
    elapsedMs: number;
    cacheBytes: number;
    schedulerPasses: number;
  };
};

export type GraphSampleRequestV5 = Omit<GraphSampleRequestV4, 'version'> & {
  version: 5;
};

export type GraphSampleResultV5 = Omit<GraphSampleResultV4, 'version' | 'scene'> & {
  version: 5;
  scene: GraphSpatialSceneRuntimeV1;
};

export type GraphSampleRequestV6 = Omit<GraphSampleRequestV5, 'version'> & {
  version: 6;
};

export type GraphSampleResultV6 = Omit<GraphSampleResultV5, 'version' | 'scene'> & {
  version: 6;
  scene: GraphSpatialSceneRuntimeV2;
};

export const GRAPH_ANALYSIS_FEATURES = [
  'root', 'x-intercept', 'y-intercept', 'extremum', 'intersection', 'hole', 'pole',
  'vertical-asymptote', 'horizontal-asymptote', 'oblique-asymptote',
  'domain-boundary', 'piecewise-continuity', 'level-contour', 'stationary-point',
  'local-extremum', 'complex-zero', 'complex-pole', 'branch-point',
] as const;

export type GraphAnalysisFeature = typeof GRAPH_ANALYSIS_FEATURES[number];

export type GraphEvidenceLevel =
  | 'exact-proved'
  | 'conditional'
  | 'numeric-validated'
  | 'sampled-estimate'
  | 'suspected'
  | 'inconclusive'
  | 'unsupported';

export type GraphFeatureValueV1 =
  | { kind: 'exact'; value: CanonicalMathValueV2 }
  | { kind: 'approximate'; value: number; errorBound?: number };

export type GraphAnalysisEvidenceV1 = {
  version: 1;
  evidenceId: string;
  documentId: string;
  revisions: GraphRevisionSetV2;
  itemIds: string[];
  feature: GraphAnalysisFeature;
  level: GraphEvidenceLevel;
  coordinates?: { x?: GraphFeatureValueV1; y?: GraphFeatureValueV1; z?: GraphFeatureValueV1 };
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

export type GraphAnalysisRequestV1 = {
  version: 1;
  requestId: string;
  workspaceInstanceId: string;
  documentId: string;
  revisions: GraphRevisionSetV2;
  items: GraphClassifiedItemSnapshotV2[];
  parameterEnvironment: Record<string, number>;
  assumptions?: GraphAuthoredAssumptionV1[];
  complexSearchRegion?: { reMin: number; reMax: number; imMin: number; imMax: number };
  features: GraphAnalysisFeature[];
  numericWindow?: GraphViewportV1;
  maximumTimeMs: number;
};

export type GraphAnalysisResultV1 = {
  version: 1;
  requestId: string;
  workspaceInstanceId: string;
  documentId: string;
  revisions: GraphRevisionSetV2;
  status: 'complete' | 'partial' | 'cancelled';
  evidence: GraphAnalysisEvidenceV1[];
  canonicalResult: CanonicalResultDocumentV2;
  stopReasons: GraphStopReason[];
  diagnostics: {
    elapsedMs: number;
    evaluatedPointCount: number;
    exactFindingCount: number;
    validatedFindingCount: number;
    analysisRevision: number;
  };
};
