import type {
  ConeState,
  CubeState,
  CuboidState,
  CylinderState,
  RectangleState,
  SphereState,
  SquareState,
} from '../../types/calculator';
import {
  geometryError,
  geometryResult,
  nearlyEqual,
  numericLatex,
  parsePositiveDraft,
  type GeometryEvaluation,
} from './shared';

const PI = Math.PI;

export function solveSquare(state: SquareState): GeometryEvaluation {
  const side = parsePositiveDraft(state.side);
  if (side === null) {
    return geometryError('Enter a positive side length before solving the square.');
  }

  return geometryResult([
    { label: 's', latex: numericLatex(side) },
    { label: 'A', latex: numericLatex(side ** 2) },
    { label: 'P', latex: numericLatex(4 * side) },
    { label: 'd', latex: numericLatex(side * Math.SQRT2) },
  ], [], 'geometry-formula');
}

export function solveRectangle(state: RectangleState): GeometryEvaluation {
  const width = parsePositiveDraft(state.width);
  const height = parsePositiveDraft(state.height);
  if (width === null || height === null) {
    return geometryError('Enter positive width and height values before solving the rectangle.');
  }

  return geometryResult([
    { label: 'w', latex: numericLatex(width) },
    { label: 'h', latex: numericLatex(height) },
    { label: 'A', latex: numericLatex(width * height) },
    { label: 'P', latex: numericLatex(2 * (width + height)) },
    { label: 'd', latex: numericLatex(Math.sqrt(width ** 2 + height ** 2)) },
  ], [], 'geometry-formula');
}

export function solveCube(state: CubeState): GeometryEvaluation {
  const side = parsePositiveDraft(state.side);
  if (side === null) {
    return geometryError('Enter a positive side length before solving the cube.');
  }

  return geometryResult([
    { label: 's', latex: numericLatex(side) },
    { label: 'V', latex: numericLatex(side ** 3) },
    { label: 'SA', latex: numericLatex(6 * side ** 2) },
    { label: 'd', latex: numericLatex(side * Math.sqrt(3)) },
  ], [], 'geometry-formula');
}

export function solveCuboid(state: CuboidState): GeometryEvaluation {
  const length = parsePositiveDraft(state.length);
  const width = parsePositiveDraft(state.width);
  const height = parsePositiveDraft(state.height);
  if (length === null || width === null || height === null) {
    return geometryError('Enter positive length, width, and height values before solving the cuboid.');
  }

  return geometryResult([
    { label: 'l', latex: numericLatex(length) },
    { label: 'w', latex: numericLatex(width) },
    { label: 'h', latex: numericLatex(height) },
    { label: 'V', latex: numericLatex(length * width * height) },
    { label: 'SA', latex: numericLatex(2 * (length * width + width * height + length * height)) },
    { label: 'd', latex: numericLatex(Math.sqrt(length ** 2 + width ** 2 + height ** 2)) },
  ], [], 'geometry-formula');
}

export function solveCylinder(state: CylinderState): GeometryEvaluation {
  const radius = parsePositiveDraft(state.radius);
  const height = parsePositiveDraft(state.height);
  if (radius === null || height === null) {
    return geometryError('Enter positive radius and height values before solving the cylinder.');
  }

  return geometryResult([
    { label: 'r', latex: numericLatex(radius) },
    { label: 'h', latex: numericLatex(height) },
    { label: 'V', latex: numericLatex(PI * radius ** 2 * height) },
    { label: 'CSA', latex: numericLatex(2 * PI * radius * height) },
    { label: 'TSA', latex: numericLatex(2 * PI * radius * (height + radius)) },
  ], [], 'geometry-formula');
}

export function solveCone(state: ConeState): GeometryEvaluation {
  const radius = parsePositiveDraft(state.radius);
  const height = parsePositiveDraft(state.height);
  const slantHeight = parsePositiveDraft(state.slantHeight);
  if (radius === null) {
    return geometryError('Enter a positive radius before solving the cone.');
  }
  if (height === null && slantHeight === null) {
    return geometryError('Enter a positive height or slant height before solving the cone.');
  }

  let resolvedHeight = height;
  let resolvedSlant = slantHeight;

  if (resolvedHeight !== null && resolvedSlant !== null) {
    const expected = Math.sqrt(radius ** 2 + resolvedHeight ** 2);
    if (!nearlyEqual(expected, resolvedSlant, 1e-6)) {
      return geometryError('The cone height and slant height must satisfy l^2 = r^2 + h^2.');
    }
  } else if (resolvedHeight !== null) {
    resolvedSlant = Math.sqrt(radius ** 2 + resolvedHeight ** 2);
  } else {
    if (resolvedSlant === null || resolvedSlant <= radius) {
      return geometryError('The slant height must be longer than the radius.');
    }
    resolvedHeight = Math.sqrt(resolvedSlant ** 2 - radius ** 2);
  }

  return geometryResult([
    { label: 'r', latex: numericLatex(radius) },
    { label: 'h', latex: numericLatex(resolvedHeight) },
    { label: 'l', latex: numericLatex(resolvedSlant) },
    { label: 'V', latex: numericLatex((PI * radius ** 2 * resolvedHeight) / 3) },
    { label: 'TSA', latex: numericLatex(PI * radius * (radius + resolvedSlant)) },
  ], [], 'geometry-formula');
}

export function solveSphere(state: SphereState): GeometryEvaluation {
  const radius = parsePositiveDraft(state.radius);
  if (radius === null) {
    return geometryError('Enter a positive radius before solving the sphere.');
  }

  return geometryResult([
    { label: 'r', latex: numericLatex(radius) },
    { label: 'V', latex: numericLatex((4 / 3) * PI * radius ** 3) },
    { label: 'SA', latex: numericLatex(4 * PI * radius ** 2) },
  ], [], 'geometry-formula');
}

