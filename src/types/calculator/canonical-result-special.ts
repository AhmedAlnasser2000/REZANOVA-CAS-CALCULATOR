import type { CanonicalMathValue } from './canonical-result-common';

export const CANONICAL_SPECIAL_FUNCTION_ARITIES = {
  erfi: 1,
  Si: 1,
  Ci: 1,
  Ei: 1,
  li: 1,
  EllipticF: 2,
  EllipticE: 2,
  EllipticPi: 3,
} as const;

export type CanonicalSpecialFunctionName =
  keyof typeof CANONICAL_SPECIAL_FUNCTION_ARITIES;

export type CanonicalSpecialFunctionExpression =
  | {
      kind: 'standard-math';
      value: CanonicalMathValue;
    }
  | {
      kind: 'named-function';
      name: CanonicalSpecialFunctionName;
      arguments: CanonicalSpecialFunctionExpression[];
    }
  | {
      kind: 'sum';
      terms: CanonicalSpecialFunctionExpression[];
    }
  | {
      kind: 'product';
      factors: CanonicalSpecialFunctionExpression[];
    }
  | {
      kind: 'quotient';
      numerator: CanonicalSpecialFunctionExpression;
      denominator: CanonicalSpecialFunctionExpression;
    }
  | {
      kind: 'power';
      base: CanonicalSpecialFunctionExpression;
      exponent: CanonicalSpecialFunctionExpression;
    }
  | {
      kind: 'negation';
      operand: CanonicalSpecialFunctionExpression;
    }
  | {
      kind: 'piecewise';
      branches: Array<{
        value: CanonicalSpecialFunctionExpression;
        condition: CanonicalMathValue;
      }>;
      otherwise?: CanonicalSpecialFunctionExpression;
    };

export type CanonicalResultSpecialFunctionPrimary = {
  kind: 'special-function-expression';
  expression: CanonicalSpecialFunctionExpression;
};
