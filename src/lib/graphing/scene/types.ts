import type {
  GraphGridSceneV1,
  GraphItemPresentationV1,
  GraphRevisionSetV1,
  GraphSceneLabelV1,
  GraphSceneValidationFailure,
  GraphStopReason,
  GraphViewportV1,
  SampledSceneRuntime,
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
    maximumDepthReached: number;
    elapsedMs: number;
  };
};

export type GraphSampledPathSceneInput = {
  pathId: string;
  sample: GraphPathSampleSceneInput;
  style: GraphItemPresentationV1;
  closed?: boolean;
};

export type GraphPointBatchSceneInput = {
  pointBatchId: string;
  itemId: string;
  coordinates: Float64Array;
  marker?: 'filled' | 'open';
  style: GraphItemPresentationV1;
};

export type GraphRegionSceneInput = {
  regionId: string;
  itemId: string;
  vertices: Float64Array;
  triangleIndices: Uint32Array;
  boundaryPathIds: string[];
  style: GraphItemPresentationV1;
};

export type GraphSceneAssemblyInput = {
  revisions: { scene: number } & GraphRevisionSetV1;
  viewport: GraphViewportV1;
  paths: GraphSampledPathSceneInput[];
  regions?: GraphRegionSceneInput[];
  pointBatches?: GraphPointBatchSceneInput[];
  labels?: GraphSceneLabelV1[];
  grid?: GraphGridSceneV1;
};

export type GraphSceneRuntimeBundle = {
  scene: SampledSceneRuntime;
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
