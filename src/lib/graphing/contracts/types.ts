import type { SerializableMathJson } from '../../../types/calculator/math-payload-types';

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

export type GraphItemSpecV1 =
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
      visible: boolean;
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

export type GraphRendererPresentationFrameV1 = {
  version: 1;
  contentRevision: number;
  items: Array<{ itemId: string; presentation: GraphItemPresentationV1 }>;
};

export type GraphHitResult = {
  itemId: string;
  sceneRevision: number;
  pathIndex?: number;
  pointIndex?: number;
  parameterValue?: number;
  world: { x: number; y: number };
  distancePixels: number;
};

export interface InteractiveGraphRenderer {
  readonly capabilities: GraphRendererCapabilities;
  mount(target: HTMLElement): void;
  resize(cssWidth: number, cssHeight: number, devicePixelRatio: number): void;
  setView(frame: GraphRendererViewFrameV1): void;
  setScene(frame: GraphRendererSceneFrameV1 | null): void;
  setPresentation(frame: GraphRendererPresentationFrameV1): void;
  hitTest(clientX: number, clientY: number): GraphHitResult | null;
  handleContextRestored(): void;
  dispose(): void;
}

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

export type GraphSamplingItemEvidenceV1 = {
  itemId: string;
  route: GraphRelationIR['kind'] | 'piecewise' | 'point-set' | 'unit-circle';
  achievedQuality: 'coarse' | 'settled' | 'polished' | 'reduced-detail' | 'unresolved';
  estimatedMaximumErrorPixels: number;
  cache: 'miss' | 'reused' | 'extended';
  refinable: boolean;
  stopReason?: GraphStopReason;
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
