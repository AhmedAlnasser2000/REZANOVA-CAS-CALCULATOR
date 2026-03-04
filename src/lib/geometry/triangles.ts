import type {
  TriangleAreaState,
  TriangleHeronState,
} from '../../types/calculator';
import {
  geometryError,
  geometryResult,
  numericLatex,
  parsePositiveDraft,
  type GeometryEvaluation,
} from './shared';

const EPSILON = 1e-9;

export function solveTriangleArea(state: TriangleAreaState): GeometryEvaluation {
  const base = parsePositiveDraft(state.base);
  const height = parsePositiveDraft(state.height);
  if (base === null || height === null) {
    return geometryError('Enter positive base and height values before solving the triangle area.');
  }

  return geometryResult([
    { label: 'b', latex: numericLatex(base) },
    { label: 'h', latex: numericLatex(height) },
    { label: 'A', latex: numericLatex((base * height) / 2) },
  ], [], 'geometry-formula');
}

export function solveTriangleHeron(state: TriangleHeronState): GeometryEvaluation {
  const a = parsePositiveDraft(state.a);
  const b = parsePositiveDraft(state.b);
  const c = parsePositiveDraft(state.c);
  if (a === null || b === null || c === null) {
    return geometryError('Enter three positive side lengths before using Heron\'s formula.');
  }
  if (a + b <= c + EPSILON || a + c <= b + EPSILON || b + c <= a + EPSILON) {
    return geometryError('The three side lengths do not satisfy the triangle inequality.');
  }

  const semiperimeter = (a + b + c) / 2;
  const area = Math.sqrt(
    semiperimeter
    * (semiperimeter - a)
    * (semiperimeter - b)
    * (semiperimeter - c),
  );

  return geometryResult([
    { label: 'a', latex: numericLatex(a) },
    { label: 'b', latex: numericLatex(b) },
    { label: 'c', latex: numericLatex(c) },
    { label: 's', latex: numericLatex(semiperimeter) },
    { label: 'A', latex: numericLatex(area) },
  ], [], 'geometry-formula');
}
