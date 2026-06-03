import {
  allRealInequalitySet,
  emptyInequalitySet,
  normalizeInequalitySet,
  type InequalityInterval,
  type InequalitySet,
} from './inequality-core';

const SIGN_EPSILON = 1e-9;

export type SignInequalityRelation = 'Less' | 'LessEqual' | 'Greater' | 'GreaterEqual';

export type SignCriticalPoint = {
  numeric: number;
  latex: string;
};

export type SignDomainExclusion = {
  numeric: number;
  latex: string;
};

type BoundaryPoint = {
  numeric: number;
  latex: string;
  zero: boolean;
  excluded: boolean;
};

export type SignAnalysisInput = {
  variable: string;
  relation: SignInequalityRelation;
  roots?: readonly SignCriticalPoint[];
  exclusions?: readonly SignDomainExclusion[];
  evaluateAt: (value: number) => number | null;
};

export type SignAnalysisResult =
  | { kind: 'success'; set: InequalitySet; boundaryPoints: readonly BoundaryPoint[] }
  | { kind: 'stop'; reason: 'invalid-boundary' | 'sample-failed' };

export function relationToSymbol(relation: SignInequalityRelation) {
  switch (relation) {
    case 'Less':
      return '<';
    case 'LessEqual':
      return '<=';
    case 'Greater':
      return '>';
    case 'GreaterEqual':
      return '>=';
  }
}

export function equalityAllowedForRelation(relation: SignInequalityRelation) {
  return relation === 'LessEqual' || relation === 'GreaterEqual';
}

export function testSignRelation(value: number, relation: SignInequalityRelation) {
  switch (relation) {
    case 'Less':
      return value < -SIGN_EPSILON;
    case 'LessEqual':
      return value <= SIGN_EPSILON;
    case 'Greater':
      return value > SIGN_EPSILON;
    case 'GreaterEqual':
      return value >= -SIGN_EPSILON;
  }
}

function assertFinitePoint(point: SignCriticalPoint | SignDomainExclusion) {
  return Number.isFinite(point.numeric);
}

function mergeBoundaryPoints(
  roots: readonly SignCriticalPoint[],
  exclusions: readonly SignDomainExclusion[],
) {
  const points = new Map<string, BoundaryPoint>();
  const keyFor = (numeric: number) => `${Math.round(numeric / SIGN_EPSILON)}`;

  for (const root of roots) {
    if (!assertFinitePoint(root)) {
      return null;
    }
    const key = keyFor(root.numeric);
    const previous = points.get(key);
    points.set(key, {
      numeric: previous?.numeric ?? root.numeric,
      latex: previous?.latex ?? root.latex,
      zero: true,
      excluded: previous?.excluded ?? false,
    });
  }

  for (const exclusion of exclusions) {
    if (!assertFinitePoint(exclusion)) {
      return null;
    }
    const key = keyFor(exclusion.numeric);
    const previous = points.get(key);
    points.set(key, {
      numeric: previous?.numeric ?? exclusion.numeric,
      latex: previous?.latex ?? exclusion.latex,
      zero: previous?.zero ?? false,
      excluded: true,
    });
  }

  return [...points.values()].sort((left, right) => left.numeric - right.numeric);
}

function chooseSample(lower: BoundaryPoint | undefined, upper: BoundaryPoint | undefined) {
  if (!lower && !upper) {
    return 0;
  }
  if (!lower && upper) {
    return upper.numeric - 1;
  }
  if (lower && !upper) {
    return lower.numeric + 1;
  }
  if (lower && upper) {
    return (lower.numeric + upper.numeric) / 2;
  }
  return 0;
}

export function buildSignChartInequalitySet(input: SignAnalysisInput): SignAnalysisResult {
  const roots = input.roots ?? [];
  const exclusions = input.exclusions ?? [];
  const boundaryPoints = mergeBoundaryPoints(roots, exclusions);
  if (!boundaryPoints) {
    return { kind: 'stop', reason: 'invalid-boundary' };
  }

  if (boundaryPoints.length === 0) {
    const value = input.evaluateAt(0);
    if (value === null || !Number.isFinite(value)) {
      return { kind: 'stop', reason: 'sample-failed' };
    }
    return {
      kind: 'success',
      set: testSignRelation(value, input.relation)
        ? allRealInequalitySet(input.variable)
        : emptyInequalitySet(input.variable),
      boundaryPoints,
    };
  }

  const intervals: InequalityInterval[] = [];
  const segments = [
    { lower: undefined, upper: boundaryPoints[0] },
    ...boundaryPoints.slice(0, -1).map((point, index) => ({
      lower: point,
      upper: boundaryPoints[index + 1],
    })),
    { lower: boundaryPoints.at(-1), upper: undefined },
  ];

  for (const segment of segments) {
    const sample = chooseSample(segment.lower, segment.upper);
    const value = input.evaluateAt(sample);
    if (value === null || !Number.isFinite(value)) {
      return { kind: 'stop', reason: 'sample-failed' };
    }
    if (!testSignRelation(value, input.relation)) {
      continue;
    }
    intervals.push({
      lower: segment.lower?.numeric,
      lowerLatex: segment.lower?.latex,
      lowerInclusive: false,
      upper: segment.upper?.numeric,
      upperLatex: segment.upper?.latex,
      upperInclusive: false,
    });
  }

  if (equalityAllowedForRelation(input.relation)) {
    intervals.push(
      ...boundaryPoints
        .filter((point) => point.zero && !point.excluded)
        .map((point) => ({
          lower: point.numeric,
          lowerLatex: point.latex,
          lowerInclusive: true,
          upper: point.numeric,
          upperLatex: point.latex,
          upperInclusive: true,
        })),
    );
  }

  return {
    kind: 'success',
    set: normalizeInequalitySet(input.variable, intervals),
    boundaryPoints,
  };
}
