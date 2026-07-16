import type {
  CanonicalMathValueV2,
  CanonicalResultDocumentV2,
} from './canonical-result-v2-types';
import type { CanonicalResultDocumentV3 } from './canonical-result-v3-types';
import type { CanonicalResultDocumentV1 } from './canonical-result-types';

export const CANONICAL_SPECIAL_FUNCTION_ARITIES_V4 = {
  erfi: 1,
  Si: 1,
  Ci: 1,
  Ei: 1,
  li: 1,
  EllipticF: 2,
  EllipticE: 2,
  EllipticPi: 3,
} as const;

export type CanonicalSpecialFunctionNameV4 =
  keyof typeof CANONICAL_SPECIAL_FUNCTION_ARITIES_V4;

export type CanonicalSpecialFunctionExpressionV4 =
  | {
      kind: 'standard-math';
      value: CanonicalMathValueV2;
    }
  | {
      kind: 'named-function';
      name: CanonicalSpecialFunctionNameV4;
      arguments: CanonicalSpecialFunctionExpressionV4[];
    }
  | {
      kind: 'sum';
      terms: CanonicalSpecialFunctionExpressionV4[];
    }
  | {
      kind: 'product';
      factors: CanonicalSpecialFunctionExpressionV4[];
    }
  | {
      kind: 'quotient';
      numerator: CanonicalSpecialFunctionExpressionV4;
      denominator: CanonicalSpecialFunctionExpressionV4;
    }
  | {
      kind: 'power';
      base: CanonicalSpecialFunctionExpressionV4;
      exponent: CanonicalSpecialFunctionExpressionV4;
    }
  | {
      kind: 'negation';
      operand: CanonicalSpecialFunctionExpressionV4;
    }
  | {
      kind: 'piecewise';
      branches: Array<{
        value: CanonicalSpecialFunctionExpressionV4;
        condition: CanonicalMathValueV2;
      }>;
      otherwise?: CanonicalSpecialFunctionExpressionV4;
    };

export type CanonicalResultSpecialFunctionPrimaryV4 = {
  kind: 'special-function-expression';
  expression: CanonicalSpecialFunctionExpressionV4;
};

export type CanonicalResultPrimaryV4 = CanonicalResultSpecialFunctionPrimaryV4;

export type CanonicalResultDocumentV4 = Omit<
  CanonicalResultDocumentV2,
  'version' | 'primary'
> & {
  version: 4;
  primary?: CanonicalResultPrimaryV4;
};

export type CanonicalResultDocument =
  | CanonicalResultDocumentV1
  | CanonicalResultDocumentV2
  | CanonicalResultDocumentV3
  | CanonicalResultDocumentV4;

export type CanonicalResultVersion = CanonicalResultDocument['version'];
