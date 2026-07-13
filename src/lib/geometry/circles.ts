import type {
  ArcSectorState,
  CircleState,
} from '../../types/calculator';
import { convertAngle } from '../trigonometry/angles';
import {
  geometryError,
  geometryResult,
  numericGeometryMathJson,
  numericLatex,
  parsePositiveDraft,
  type GeometryEvaluation,
} from './shared';

const PI = Math.PI;

function piMultipleLatex(multiplier: number) {
  return multiplier === 1 ? '\\pi' : `${numericLatex(multiplier)}\\pi`;
}

export function solveCircle(state: CircleState): GeometryEvaluation {
  const radius = parsePositiveDraft(state.radius);
  if (radius === null) {
    return geometryError('Enter a positive radius before solving the circle.');
  }

  return geometryResult([
    { label: 'r', latex: numericLatex(radius), mathJson: numericGeometryMathJson(radius) },
    { label: 'd', latex: numericLatex(2 * radius), mathJson: numericGeometryMathJson(2 * radius) },
    {
      label: 'C',
      latex: piMultipleLatex(2 * radius),
      text: numericLatex(2 * PI * radius),
      mathJson: ['InvisibleOperator', numericGeometryMathJson(2 * radius), 'Pi'],
    },
    {
      label: 'A',
      latex: piMultipleLatex(radius ** 2),
      text: numericLatex(PI * radius ** 2),
      mathJson: ['InvisibleOperator', numericGeometryMathJson(radius ** 2), 'Pi'],
    },
  ], [], 'geometry-formula');
}

export function solveArcSector(state: ArcSectorState): GeometryEvaluation {
  const radius = parsePositiveDraft(state.radius);
  const angle = parsePositiveDraft(state.angle);
  if (radius === null || angle === null) {
    return geometryError('Enter a positive radius and a positive angle before solving the sector.');
  }

  const radians = convertAngle(angle, state.angleUnit, 'rad');
  return geometryResult([
    { label: 'r', latex: numericLatex(radius) },
    { label: 'theta', latex: `${numericLatex(angle)}\\ ${state.angleUnit}` },
    { label: 'arc', latex: numericLatex(radius * radians) },
    { label: 'sector', latex: numericLatex(0.5 * radius ** 2 * radians) },
  ], [], 'geometry-formula');
}
