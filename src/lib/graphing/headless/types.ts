import type {
  GraphSceneValidationFailure,
  SampledSceneSnapshotV1,
} from '../contracts';
import type { GraphSceneRuntimeBundle } from '../scene';

export type GraphHeadlessSceneEvidence = {
  snapshot: SampledSceneSnapshotV1;
  snapshotHash: string;
  pathCount: number;
  segmentCount: number;
  vertexCount: number;
  regionCount: number;
  triangleCount: number;
  pointCount: number;
  labelCount: number;
  transferableByteLength: number;
};

export type GraphHeadlessSceneResult =
  | { ok: true; evidence: GraphHeadlessSceneEvidence }
  | { ok: false; failure: GraphSceneValidationFailure };

export type GraphHeadlessSceneInput = GraphSceneRuntimeBundle;
