import type {
  DistanceState,
  LineEquationState,
  MidpointState,
  SlopeState,
} from '../../types/calculator';
import {
  geometryError,
  geometryResult,
  nearlyEqual,
  numericLatex,
  parsePointDraft,
  pointLatex,
  type GeometryEvaluation,
} from './shared';

const EPSILON = 1e-9;

function requirePoints(
  first: DistanceState['p1'],
  second: DistanceState['p2'],
) {
  const p1 = parsePointDraft(first);
  const p2 = parsePointDraft(second);
  if (p1.x === null || p1.y === null || p2.x === null || p2.y === null) {
    return null;
  }

  return {
    p1: { x: p1.x, y: p1.y },
    p2: { x: p2.x, y: p2.y },
    dx: p2.x - p1.x,
    dy: p2.y - p1.y,
  };
}

function gcd(left: number, right: number): number {
  let a = Math.abs(left);
  let b = Math.abs(right);
  while (b !== 0) {
    const next = a % b;
    a = b;
    b = next;
  }
  return a || 1;
}

function formatSignedTerm(value: number, symbol: string, first = false) {
  if (nearlyEqual(value, 0)) {
    return first ? '0' : '';
  }

  const absolute = Math.abs(value);
  const magnitude = nearlyEqual(absolute, 1) ? '' : numericLatex(absolute);
  const base = `${magnitude}${symbol}`;
  if (first) {
    return value < 0 ? `-${base}` : base;
  }
  return value < 0 ? `-${base}` : `+${base}`;
}

function formatSignedConstant(value: number) {
  if (nearlyEqual(value, 0)) {
    return '';
  }
  return value < 0 ? `${numericLatex(value)}` : `+${numericLatex(value)}`;
}

function standardForm(dx: number, dy: number, x: number, y: number) {
  let a = dy;
  let b = -dx;
  let c = dy * x - dx * y;

  if ([a, b, c].every((value) => nearlyEqual(value, Math.round(value)))) {
    const intA = Math.round(a);
    const intB = Math.round(b);
    const intC = Math.round(c);
    const divisor = gcd(gcd(intA, intB), intC);
    a = intA / divisor;
    b = intB / divisor;
    c = intC / divisor;
  }

  if (a < 0 || (nearlyEqual(a, 0) && b < 0)) {
    a *= -1;
    b *= -1;
    c *= -1;
  }

  const left = `${formatSignedTerm(a, 'x', true)}${formatSignedTerm(b, 'y')}`;
  return `${left}=${numericLatex(c)}`;
}

export function solveDistance(state: DistanceState): GeometryEvaluation {
  const parsed = requirePoints(state.p1, state.p2);
  if (!parsed) {
    return geometryError('Enter both points before solving the distance.');
  }

  return geometryResult([
    { label: 'P_1', latex: pointLatex(parsed.p1.x, parsed.p1.y) },
    { label: 'P_2', latex: pointLatex(parsed.p2.x, parsed.p2.y) },
    { label: 'd', latex: numericLatex(Math.sqrt(parsed.dx ** 2 + parsed.dy ** 2)) },
  ], [], 'geometry-coordinate');
}

export function solveMidpoint(state: MidpointState): GeometryEvaluation {
  const parsed = requirePoints(state.p1, state.p2);
  if (!parsed) {
    return geometryError('Enter both points before solving the midpoint.');
  }

  return geometryResult([
    { label: 'P_1', latex: pointLatex(parsed.p1.x, parsed.p1.y) },
    { label: 'P_2', latex: pointLatex(parsed.p2.x, parsed.p2.y) },
    {
      label: 'M',
      latex: pointLatex((parsed.p1.x + parsed.p2.x) / 2, (parsed.p1.y + parsed.p2.y) / 2),
    },
  ], [], 'geometry-coordinate');
}

export function solveSlope(state: SlopeState): GeometryEvaluation {
  const parsed = requirePoints(state.p1, state.p2);
  if (!parsed) {
    return geometryError('Enter both points before solving the slope.');
  }

  if (Math.abs(parsed.dx) < EPSILON) {
    return geometryResult([
      { label: 'm', latex: '\\text{undefined}', text: 'undefined' },
    ], ['Vertical lines do not have a finite slope.'], 'geometry-coordinate');
  }

  return geometryResult([
    { label: 'm', latex: numericLatex(parsed.dy / parsed.dx) },
  ], [], 'geometry-coordinate');
}

export function solveLineEquation(state: LineEquationState): GeometryEvaluation {
  const parsed = requirePoints(state.p1, state.p2);
  if (!parsed) {
    return geometryError('Enter both points before building the line equation.');
  }
  if (nearlyEqual(parsed.dx, 0) && nearlyEqual(parsed.dy, 0)) {
    return geometryError('The two points must be different to define a line.');
  }

  if (Math.abs(parsed.dx) < EPSILON) {
    const xLine = `x=${numericLatex(parsed.p1.x)}`;
    return {
      exactLatex: xLine,
      approxText: xLine,
      warnings: ['Vertical lines are reported in x = constant form.'],
      resultOrigin: 'geometry-coordinate',
    };
  }

  const slope = parsed.dy / parsed.dx;
  const intercept = parsed.p1.y - slope * parsed.p1.x;

  let exactLatex: string;
  if (state.form === 'point-slope') {
    exactLatex = `y-${numericLatex(parsed.p1.y)}=${numericLatex(slope)}\\left(x-${numericLatex(parsed.p1.x)}\\right)`;
  } else if (state.form === 'standard') {
    exactLatex = standardForm(parsed.dx, parsed.dy, parsed.p1.x, parsed.p1.y);
  } else {
    exactLatex = `y=${formatSignedTerm(slope, 'x', true)}${formatSignedConstant(intercept)}`;
  }

  return {
    exactLatex,
    approxText: exactLatex.replaceAll('\\left', '').replaceAll('\\right', ''),
    warnings: [],
    resultOrigin: 'geometry-coordinate',
  };
}

