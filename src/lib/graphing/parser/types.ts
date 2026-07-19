import type { SerializableMathJson } from '../../../types/calculator/math-payload-types';
import type {
  GraphExpressionIR,
  GraphPiecewiseSpecV1,
  GraphRelationIR,
  GraphStopReason,
} from '../contracts';

export type GraphSourceClassificationV1 =
  | {
      ok: true;
      itemKind: 'relation';
      relation: GraphRelationIR;
    }
  | {
      ok: true;
      itemKind: 'piecewise';
      piecewise: GraphPiecewiseSpecV1;
    }
  | {
      ok: true;
      itemKind: 'parameter-definition';
      symbol: string;
      value: GraphExpressionIR;
    }
  | {
      ok: true;
      itemKind: 'point-set';
      points: Array<{ x: SerializableMathJson; y: SerializableMathJson }>;
    }
  | {
      ok: false;
      stopReason: GraphStopReason;
    };

export type GraphParserFailure = Extract<GraphSourceClassificationV1, { ok: false }>;

export type GraphParserSuccess = Extract<GraphSourceClassificationV1, { ok: true }>;

export function graphParserFailure(
  code: GraphStopReason['code'],
  detailCode: string,
  path?: string,
): GraphParserFailure {
  return {
    ok: false,
    stopReason: {
      code,
      detailCode,
      ...(path ? { path } : {}),
    },
  };
}
