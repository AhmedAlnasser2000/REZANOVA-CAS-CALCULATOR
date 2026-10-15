import type { ExactScalar } from '../../../../algebra/polynomial-core';

export type MathJson = string | number | boolean | null | MathJson[] | { [key: string]: MathJson | undefined };

export type ExactComplexScalar = {
  re: ExactScalar;
  im: ExactScalar;
};

export const ZERO_SCALAR: ExactScalar = { numerator: 0, denominator: 1 };

export const ONE_SCALAR: ExactScalar = { numerator: 1, denominator: 1 };
