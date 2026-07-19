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
import type { GraphSampledExplicitPath } from '../sampling';

export type GraphSampledPathSceneInput = {
  pathId: string;
  sample: GraphSampledExplicitPath;
  style: GraphItemPresentationV1;
  closed?: boolean;
};

export type GraphSceneAssemblyInput = {
  revisions: { scene: number } & GraphRevisionSetV1;
  viewport: GraphViewportV1;
  paths: GraphSampledPathSceneInput[];
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
