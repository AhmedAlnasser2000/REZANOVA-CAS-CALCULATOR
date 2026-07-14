import {
  addExactScalars,
  divideExactScalars,
  exactScalarIsZero,
  multiplyExactScalars,
  subtractExactScalars,
  type ExactScalar,
} from '../algebra/polynomial-core';
import { scalar, type ExactVector } from './exact-matrix-core';

function dotVectors(left: ExactVector, right: ExactVector): ExactScalar {
  return left.reduce(
    (sum, value, index) => addExactScalars(sum, multiplyExactScalars(value, right[index])),
    scalar(0),
  );
}

function scaleVector(vector: ExactVector, factor: ExactScalar): ExactVector {
  return vector.map((value) => multiplyExactScalars(value, factor));
}

function subtractVectors(left: ExactVector, right: ExactVector): ExactVector {
  return left.map((value, index) => subtractExactScalars(value, right[index]));
}

function vectorIsZero(vector: ExactVector): boolean {
  return vector.every(exactScalarIsZero);
}

export type ExactOrthogonalizationProjection = {
  basisIndex: number;
  coefficient: ExactScalar;
  vector: ExactVector;
};

export type ExactOrthogonalizationStep = {
  inputIndex: number;
  input: ExactVector;
  residual: ExactVector;
  projections: ExactOrthogonalizationProjection[];
  discarded: boolean;
  basisIndex?: number;
};

export type ExactOrthogonalizationResult = {
  orthogonalBasis: ExactVector[];
  steps: ExactOrthogonalizationStep[];
  discardedInputIndices: number[];
};

export function orthogonalizeExactVectors(
  vectors: readonly ExactVector[],
): ExactOrthogonalizationResult {
  const orthogonalBasis: ExactVector[] = [];
  const steps: ExactOrthogonalizationStep[] = [];
  const discardedInputIndices: number[] = [];

  vectors.forEach((input, inputIndex) => {
    let residual = [...input];
    const projections: ExactOrthogonalizationProjection[] = [];

    orthogonalBasis.forEach((basisVector, basisIndex) => {
      const denominator = dotVectors(basisVector, basisVector);
      const coefficient = divideExactScalars(
        dotVectors(residual, basisVector),
        denominator,
      );
      if (!coefficient) {
        return;
      }
      const projection = scaleVector(basisVector, coefficient);
      residual = subtractVectors(residual, projection);
      projections.push({
        basisIndex,
        coefficient,
        vector: projection,
      });
    });

    const discarded = vectorIsZero(residual);
    if (discarded) {
      discardedInputIndices.push(inputIndex);
      steps.push({
        inputIndex,
        input: [...input],
        residual,
        projections,
        discarded: true,
      });
      return;
    }

    const basisIndex = orthogonalBasis.length;
    orthogonalBasis.push(residual);
    steps.push({
      inputIndex,
      input: [...input],
      residual,
      projections,
      discarded: false,
      basisIndex,
    });
  });

  return {
    orthogonalBasis,
    steps,
    discardedInputIndices,
  };
}
