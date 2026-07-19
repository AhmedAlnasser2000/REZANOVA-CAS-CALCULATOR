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
  | { kind: 'polar-radius'; radius: GraphExpressionIR; angleSymbol: 'theta' }
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

export type GraphSceneLabelV1 = {
  labelId: string;
  itemId?: string;
  role: 'axis' | 'tick' | 'relation' | 'feature' | 'trace';
  anchor: { x: number; y: number };
  priority: number;
  mathJson?: SerializableMathJson;
  plainText?: string;
};

export type GraphGridSceneV1 = {
  kind: 'cartesian' | 'polar' | 'argand' | 'none';
  majorLines: number[];
  minorLines: number[];
  labels: GraphSceneLabelV1[];
  hysteresisKey: string;
};

export type GraphScenePathRuntime = {
  pathId: string;
  itemId: string;
  coordinates: Float64Array;
  segmentOffsets: Uint32Array;
  parameterValues?: Float64Array;
  closed: boolean;
  style: GraphItemPresentationV1;
};

export type GraphSceneRegionRuntime = {
  regionId: string;
  itemId: string;
  vertices: Float64Array;
  triangleIndices: Uint32Array;
  boundaryPathIds: string[];
  style: GraphItemPresentationV1;
};

export type GraphScenePointBatchRuntime = {
  pointBatchId: string;
  itemId: string;
  coordinates: Float64Array;
  marker?: 'filled' | 'open';
  style: GraphItemPresentationV1;
};

export type SampledSceneRuntime = {
  sceneRevision: number;
  documentRevision: number;
  viewportRevision: number;
  parameterRevision: number;
  paths: GraphScenePathRuntime[];
  regions: GraphSceneRegionRuntime[];
  pointBatches: GraphScenePointBatchRuntime[];
  labels: GraphSceneLabelV1[];
  grid: GraphGridSceneV1;
};

export type SampledSceneSnapshotV1 = {
  version: 1;
  revisions: { scene: number } & GraphRevisionSetV1;
  viewport: GraphViewportV1;
  paths: Array<Omit<GraphScenePathRuntime, 'coordinates' | 'segmentOffsets' | 'parameterValues'> & {
    coordinates: number[];
    segmentOffsets: number[];
    parameterValues?: number[];
  }>;
  regions: Array<Omit<GraphSceneRegionRuntime, 'vertices' | 'triangleIndices'> & {
    vertices: number[];
    triangleIndices: number[];
  }>;
  pointBatches: Array<Omit<GraphScenePointBatchRuntime, 'coordinates'> & {
    coordinates: number[];
  }>;
  labels: GraphSceneLabelV1[];
  grid: GraphGridSceneV1;
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

export type GraphRenderFrameV1 = {
  version: 1;
  scene: SampledSceneRuntime;
  viewport: GraphViewportV1;
  policy: GraphRenderPolicy;
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
  render(frame: GraphRenderFrameV1): void;
  hitTest(clientX: number, clientY: number): GraphHitResult | null;
  handleContextRestored(): void;
  dispose(): void;
}

export type GraphSamplingBudgetsV1 = {
  maximumRecursionDepth: number;
  maximumSamples: number;
  maximumTimeMs: number;
  maximumVertices: number;
};

export type GraphClassifiedItemSnapshotV1 = Extract<
  GraphItemSpecV1,
  { kind: 'relation' | 'piecewise' | 'point-set' }
>;

export type GraphSampleRequestV1 = {
  version: 1;
  requestId: string;
  workspaceInstanceId: string;
  documentId: string;
  revisions: { scene: number } & GraphRevisionSetV1;
  items: GraphClassifiedItemSnapshotV1[];
  parameterEnvironment: Record<string, number>;
  viewport: GraphViewportV1;
  cssSize: { width: number; height: number };
  grid: GraphGridPolicyV1;
  quality: 'preview' | 'settled';
  budgets: GraphSamplingBudgetsV1;
};

export type GraphSampleResultV1 = {
  version: 1;
  requestId: string;
  workspaceInstanceId: string;
  documentId: string;
  revisions: { scene: number } & GraphRevisionSetV1;
  viewport: GraphViewportV1;
  quality: 'preview' | 'settled';
  status: 'complete' | 'budget-exhausted' | 'cancelled';
  scene: SampledSceneRuntime;
  snapshotHash: string;
  stopReasons: GraphStopReason[];
  evidence: {
    sampleCount: number;
    vertexCount: number;
    elapsedMs: number;
  };
};
