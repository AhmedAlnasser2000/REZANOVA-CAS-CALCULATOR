import type {
  GraphSamplingLimitsV2,
  GraphSamplingQualityV3,
  GraphStopReason,
  GraphViewportV1,
} from '../contracts';
import type { CompiledGraphExpressionPlan } from '../evaluator';
import type { GraphAdaptiveQualityPolicyV1 } from './adaptive-policy';

export type CompiledExplicitGraphRelationPlan = {
  itemId: string;
  sourceRevision: number;
  relationKind: 'explicit-y' | 'explicit-x';
  independentSymbol: 'x' | 'y';
  expression: CompiledGraphExpressionPlan;
};

export type GraphSamplerControl = {
  now?: () => number;
  isCancelled?: () => boolean;
};

export type GraphExplicitSamplingInput = {
  plan: CompiledExplicitGraphRelationPlan;
  viewport: GraphViewportV1;
  cssSize: { width: number; height: number };
  parameterEnvironment: Readonly<Record<string, number>>;
  quality: GraphSamplingQualityV3;
  limits: GraphSamplingLimitsV2;
  policy?: GraphAdaptiveQualityPolicyV1;
  control?: GraphSamplerControl;
};

export type GraphSampledExplicitPath = {
  itemId: string;
  relationKind: 'explicit-y' | 'explicit-x';
  quality: GraphSamplingQualityV3;
  status: 'complete' | 'budget-exhausted' | 'cancelled';
  coordinates: Float64Array;
  independentValues: Float64Array;
  segmentOffsets: Uint32Array;
  stopReason?: GraphStopReason;
  stats: {
    evaluatedSamples: number;
    emittedVertices: number;
    elapsedMs: number;
  };
};
