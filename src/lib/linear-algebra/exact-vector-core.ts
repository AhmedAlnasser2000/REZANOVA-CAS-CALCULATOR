import {
  addExactScalars,
  divideExactScalars,
  exactScalarIsZero,
  multiplyExactScalars,
  subtractExactScalars,
  type ExactScalar,
} from '../algebra/polynomial-core';
import type { ExactVector } from './exact-matrix-core';
import { scalar } from './exact-matrix-core';
import {
  orthogonalizeExactVectors,
  type ExactOrthogonalizationStep,
} from './exact-orthogonalization';

export function exactVectorIsZero(vector: ExactVector): boolean {
  return vector.every(exactScalarIsZero);
}

export function exactDotVectors(left: ExactVector, right: ExactVector): ExactScalar {
  return left.reduce(
    (sum, value, index) => addExactScalars(sum, multiplyExactScalars(value, right[index])),
    scalar(0),
  );
}

export function exactAddVectors(left: ExactVector, right: ExactVector): ExactVector {
  return left.map((value, index) => addExactScalars(value, right[index]));
}

export function exactSubtractVectors(left: ExactVector, right: ExactVector): ExactVector {
  return left.map((value, index) => subtractExactScalars(value, right[index]));
}

export function exactCrossVectors(left: ExactVector, right: ExactVector): ExactVector | null {
  if (left.length !== 3 || right.length !== 3) {
    return null;
  }

  return [
    subtractExactScalars(
      multiplyExactScalars(left[1], right[2]),
      multiplyExactScalars(left[2], right[1]),
    ),
    subtractExactScalars(
      multiplyExactScalars(left[2], right[0]),
      multiplyExactScalars(left[0], right[2]),
    ),
    subtractExactScalars(
      multiplyExactScalars(left[0], right[1]),
      multiplyExactScalars(left[1], right[0]),
    ),
  ];
}

export function exactScaleVector(vector: ExactVector, factor: ExactScalar): ExactVector {
  return vector.map((value) => multiplyExactScalars(value, factor));
}

export function exactProjectionOntoVector(base: ExactVector, target: ExactVector): ExactVector | null {
  const denominator = exactDotVectors(base, base);
  if (exactScalarIsZero(denominator)) {
    return null;
  }

  const factor = divideExactScalars(exactDotVectors(target, base), denominator);
  return factor ? exactScaleVector(base, factor) : null;
}

export function exactOrthogonalComponentToVector(base: ExactVector, target: ExactVector): ExactVector | null {
  const projection = exactProjectionOntoVector(base, target);
  return projection ? exactSubtractVectors(target, projection) : null;
}

function perfectSquareRoot(value: number): number | null {
  if (value < 0 || !Number.isSafeInteger(value)) {
    return null;
  }

  const root = Math.sqrt(value);
  return Number.isSafeInteger(root) && root * root === value ? root : null;
}

export function exactScalarSquareRoot(value: ExactScalar): ExactScalar | null {
  if (value.numerator < 0) {
    return null;
  }

  const numerator = perfectSquareRoot(value.numerator);
  const denominator = perfectSquareRoot(value.denominator);
  return numerator !== null && denominator !== null ? scalar(numerator, denominator) : null;
}

export function exactUnitVector(vector: ExactVector): ExactVector | null {
  const norm = exactScalarSquareRoot(exactDotVectors(vector, vector));
  if (!norm || exactScalarIsZero(norm)) {
    return null;
  }

  const unit: ExactVector = [];
  for (const value of vector) {
    const divided = divideExactScalars(value, norm);
    if (!divided) {
      return null;
    }
    unit.push(divided);
  }
  return unit;
}

export type ExactGramSchmidtResult = {
  orthogonalBasis: ExactVector[];
  orthonormalBasis: ExactVector[] | null;
  notes: string[];
  steps: ExactOrthogonalizationStep[];
};

function discardedVectorNote(index: number) {
  if (index === 0) {
    return 'The first vector is zero and contributes no basis direction.';
  }
  if (index === 1) {
    return 'The second vector has zero residual after projection, so it is dependent on the earlier basis vectors.';
  }
  return `Input vector ${index + 1} has zero residual after projection, so it is dependent on the earlier basis vectors.`;
}

export function exactGramSchmidtVectors(
  vectors: readonly ExactVector[],
): ExactGramSchmidtResult | null {
  const orthogonalization = orthogonalizeExactVectors(vectors);
  const { orthogonalBasis, steps } = orthogonalization;
  const notes = orthogonalization.discardedInputIndices.map(discardedVectorNote);

  if (orthogonalBasis.length === 0) {
    return null;
  }

  const orthonormalBasis: ExactVector[] = [];
  for (const basisVector of orthogonalBasis) {
    const unit = exactUnitVector(basisVector);
    if (!unit) {
      return {
        orthogonalBasis,
        orthonormalBasis: null,
        notes,
        steps,
      };
    }
    orthonormalBasis.push(unit);
  }

  return {
    orthogonalBasis,
    orthonormalBasis,
    notes,
    steps,
  };
}

export function exactGramSchmidtTwoVectors(
  first: ExactVector,
  second: ExactVector,
): ExactGramSchmidtResult | null {
  return exactGramSchmidtVectors([first, second]);
}
