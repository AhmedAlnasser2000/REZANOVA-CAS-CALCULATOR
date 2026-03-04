import type {
  AngleUnit,
  VectorRequest,
  VectorResponse,
} from '../types/calculator';
import { formatNumber, scalarToLatex, vectorToLatex } from './format';

function dot(a: number[], b: number[]) {
  return a.reduce((sum, value, index) => sum + value * b[index], 0);
}

function norm(vector: number[]) {
  return Math.sqrt(dot(vector, vector));
}

function toAngleUnit(radians: number, angleUnit: AngleUnit) {
  if (angleUnit === 'deg') {
    return radians * (180 / Math.PI);
  }

  if (angleUnit === 'grad') {
    return radians * (200 / Math.PI);
  }

  return radians;
}

export function runVectorOperation(req: VectorRequest): VectorResponse {
  const { vectorA, vectorB } = req;

  if (vectorA.length === 0) {
    return { warnings: [], error: 'Vector A is incomplete.' };
  }

  if (['dot', 'cross', 'angle', 'add', 'subtract'].includes(req.operation) && !vectorB) {
    return { warnings: [], error: 'Vector B is required for this operation.' };
  }

  if (vectorB && vectorA.length !== vectorB.length) {
    return { warnings: [], error: 'Vector dimensions must match.' };
  }

  switch (req.operation) {
    case 'dot': {
      const value = dot(vectorA, vectorB!);
      return {
        resultLatex: scalarToLatex(value),
        approxText: formatNumber(value),
        warnings: [],
      };
    }
    case 'cross': {
      if (vectorA.length !== 3 || vectorB!.length !== 3) {
        return { warnings: [], error: 'Cross product requires 3D vectors.' };
      }
      const result = [
        vectorA[1] * vectorB![2] - vectorA[2] * vectorB![1],
        vectorA[2] * vectorB![0] - vectorA[0] * vectorB![2],
        vectorA[0] * vectorB![1] - vectorA[1] * vectorB![0],
      ];
      return {
        resultLatex: vectorToLatex(result),
        warnings: [],
      };
    }
    case 'normA': {
      const value = norm(vectorA);
      return {
        resultLatex: scalarToLatex(value),
        approxText: formatNumber(value),
        warnings: [],
      };
    }
    case 'normB': {
      const value = norm(vectorB!);
      return {
        resultLatex: scalarToLatex(value),
        approxText: formatNumber(value),
        warnings: [],
      };
    }
    case 'angle': {
      const denominator = norm(vectorA) * norm(vectorB!);
      if (denominator === 0) {
        return { warnings: [], error: 'Angle is undefined when one vector has zero length.' };
      }
      const radians = Math.acos(Math.max(-1, Math.min(1, dot(vectorA, vectorB!) / denominator)));
      const angle = toAngleUnit(radians, req.angleUnit);
      const suffix = req.angleUnit === 'deg' ? '^{\\circ}' : req.angleUnit === 'grad' ? '^{g}' : '';
      return {
        resultLatex: `${scalarToLatex(angle)}${suffix}`,
        approxText: formatNumber(angle),
        warnings: [],
      };
    }
    case 'add':
      return {
        resultLatex: vectorToLatex(vectorA.map((value, index) => value + vectorB![index])),
        warnings: [],
      };
    case 'subtract':
      return {
        resultLatex: vectorToLatex(vectorA.map((value, index) => value - vectorB![index])),
        warnings: [],
      };
    default:
      return { warnings: [], error: 'Unsupported vector operation.' };
  }
}
