import type {
  GraphRevisionSetV2,
  GraphSceneLabelV1,
  GraphSceneValidationFailure,
  GraphStopReason,
  GraphViewportV1,
  SampledSceneRuntimeV2,
} from '../contracts';

export type GraphPathSampleSceneInput = {
  itemId: string;
  status: 'complete' | 'budget-exhausted' | 'cancelled';
  coordinates: Float64Array;
  independentValues?: Float64Array;
  segmentOffsets: Uint32Array;
  stopReason?: GraphStopReason;
  stats: {
    evaluatedSamples: number;
    emittedVertices: number;
    elapsedMs: number;
  };
};

export type GraphSampledPathSceneInput = {
  pathId: string;
  sample: GraphPathSampleSceneInput;
  strokeRole?: 'default' | 'strict-boundary' | 'teaching-overlay';
  closed?: boolean;
};

export type GraphPointBatchSceneInput = {
  pointBatchId: string;
  itemId: string;
  coordinates: Float64Array;
  marker?: 'filled' | 'open';
};

export type GraphRegionSceneInput = {
  regionId: string;
  itemId: string;
  vertices: Float64Array;
  triangleIndices: Uint32Array;
  boundaryPathIds: string[];
};

export type GraphSceneAssemblyInput = {
  revisions: { scene: number } & GraphRevisionSetV2;
  viewport: GraphViewportV1;
  paths: GraphSampledPathSceneInput[];
  regions?: GraphRegionSceneInput[];
  pointBatches?: GraphPointBatchSceneInput[];
  labels?: GraphSceneLabelV1[];
};

export type GraphSceneRuntimeBundle = {
  scene: SampledSceneRuntimeV2;
  viewport: GraphViewportV1;
  transferList: ArrayBuffer[];
  stopReasons: GraphStopReason[];
  evidence: {
    sampleCount: number;
    vertexCount: number;
    elapsedMs: number;
  };
};

export type GraphSceneAssemblyResult =
  | { ok: true; bundle: GraphSceneRuntimeBundle }
  | { ok: false; failure: GraphSceneValidationFailure };
