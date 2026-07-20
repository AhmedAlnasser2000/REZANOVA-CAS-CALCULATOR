import type {
  GraphSamplingBudgetsV1,
  GraphStopReason,
  GraphViewportV1,
} from '../contracts';
import type { CompiledGraphExpressionPlan } from '../evaluator';

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
  quality: 'preview' | 'settled';
  budgets: GraphSamplingBudgetsV1;
  control?: GraphSamplerControl;
};

export type GraphSampledExplicitPath = {
  itemId: string;
  relationKind: 'explicit-y' | 'explicit-x';
  quality: 'preview' | 'settled';
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
