import type { GeometryRequest } from '../../../types/calculator';
import { finiteBranchReadbackMetadata } from '../../display/branch-readback';
import { formatNumber } from '../../display/format';
import {
  resolveCoordinateValue,
  resolvePositiveScalar,
  resolveScalar,
} from '../resolvers';
import { geometryError, geometryResult } from '../shared';
import type { SolveMissingResult } from './shared';

export function solveDistanceMissing(request: Extract<GeometryRequest, { kind: 'distanceSolveMissing' }>): SolveMissingResult {
  const d = resolvePositiveScalar(request.distanceLatex, 'Distance');
  if (!d.ok) {
    return { evaluation: geometryError(d.error) };
  }
  const p1x = resolveCoordinateValue(request.p1.xLatex, 'P1 x-coordinate');
  if (!p1x.ok) {
    return { evaluation: geometryError(p1x.error) };
  }
  const p1y = resolveCoordinateValue(request.p1.yLatex, 'P1 y-coordinate');
  if (!p1y.ok) {
    return { evaluation: geometryError(p1y.error) };
  }
  const p2x = resolveCoordinateValue(request.p2.xLatex, 'P2 x-coordinate');
  if (!p2x.ok) {
    return { evaluation: geometryError(p2x.error) };
  }
  const p2y = resolveCoordinateValue(request.p2.yLatex, 'P2 y-coordinate');
  if (!p2y.ok) {
    return { evaluation: geometryError(p2y.error) };
  }

  const values = [
    ['p1x', p1x],
    ['p1y', p1y],
    ['p2x', p2x],
    ['p2y', p2y],
  ] as const;
  const unknownEntries = values.filter((entry) => entry[1].unknown);
  if (unknownEntries.length !== 1) {
    return { evaluation: geometryError('distance solve-missing requires exactly one unknown coordinate.') };
  }

  const p1KnownX = p1x.unknown ? null : p1x.value;
  const p1KnownY = p1y.unknown ? null : p1y.value;
  const p2KnownX = p2x.unknown ? null : p2x.value;
  const p2KnownY = p2y.unknown ? null : p2y.value;
  const unknownKey = unknownEntries[0][0];

  const axis = unknownKey.endsWith('x') ? 'x' : 'y';
  const anchor = axis === 'x'
    ? (unknownKey.startsWith('p1') ? p2KnownX : p1KnownX)
    : (unknownKey.startsWith('p1') ? p2KnownY : p1KnownY);
  const fixedDelta = axis === 'x'
    ? ((p2KnownY ?? 0) - (p1KnownY ?? 0))
    : ((p2KnownX ?? 0) - (p1KnownX ?? 0));
  if (anchor === null) {
    return { evaluation: geometryError('distance solve-missing could not identify the known anchor coordinate.') };
  }
  const rhs = d.value ** 2 - fixedDelta ** 2;
  if (rhs < 0) {
    return { evaluation: geometryError('No real solutions because this distance constraint is impossible for the known coordinates.') };
  }
  const variableLabel = unknownKey === 'p1x'
    ? 'x_1'
    : unknownKey === 'p1y'
      ? 'y_1'
      : unknownKey === 'p2x'
        ? 'x_2'
        : 'y_2';

  if (Math.abs(rhs) < 1e-9) {
    return {
      evaluation: geometryResult(
        [
          { label: variableLabel, latex: formatNumber(anchor) },
          { label: 'd', latex: d.normalizedLatex },
        ],
        [],
        'geometry-coordinate',
      ),
    };
  }

  const root = Math.sqrt(rhs);
  const first = anchor + root;
  const second = anchor - root;
  const coordinateBranches = [formatNumber(first), formatNumber(second)];
  const evaluation = geometryResult(
    [
      { label: `${variableLabel}^{(1)}`, latex: coordinateBranches[0] },
      { label: `${variableLabel}^{(2)}`, latex: coordinateBranches[1] },
      { label: 'd', latex: d.normalizedLatex },
    ],
    ['Two real coordinate branches satisfy this distance constraint.'],
    'geometry-coordinate',
  );
  return {
    evaluation: {
      ...evaluation,
      branchReadback: finiteBranchReadbackMetadata({
        targetLatex: variableLabel,
        relationLatex: '\\in',
        branchesLatex: coordinateBranches,
        source: 'geometry-distance-solve-missing',
      }),
    },
  };
}

export function solveMidpointMissing(request: Extract<GeometryRequest, { kind: 'midpointSolveMissing' }>): SolveMissingResult {
  const p1x = resolveCoordinateValue(request.p1.xLatex, 'P1 x-coordinate');
  if (!p1x.ok) {
    return { evaluation: geometryError(p1x.error) };
  }
  const p1y = resolveCoordinateValue(request.p1.yLatex, 'P1 y-coordinate');
  if (!p1y.ok) {
    return { evaluation: geometryError(p1y.error) };
  }
  const p2x = resolveCoordinateValue(request.p2.xLatex, 'P2 x-coordinate');
  if (!p2x.ok) {
    return { evaluation: geometryError(p2x.error) };
  }
  const p2y = resolveCoordinateValue(request.p2.yLatex, 'P2 y-coordinate');
  if (!p2y.ok) {
    return { evaluation: geometryError(p2y.error) };
  }
  const midX = resolveCoordinateValue(request.mid.xLatex, 'Midpoint x-coordinate');
  if (!midX.ok) {
    return { evaluation: geometryError(midX.error) };
  }
  const midY = resolveCoordinateValue(request.mid.yLatex, 'Midpoint y-coordinate');
  if (!midY.ok) {
    return { evaluation: geometryError(midY.error) };
  }

  const values = [
    ['p1x', p1x],
    ['p1y', p1y],
    ['p2x', p2x],
    ['p2y', p2y],
    ['mx', midX],
    ['my', midY],
  ] as const;
  const unknownEntries = values.filter((entry) => entry[1].unknown);
  if (unknownEntries.length !== 1) {
    return { evaluation: geometryError('midpoint solve-missing requires exactly one unknown coordinate.') };
  }
  const unknownKey = unknownEntries[0][0];

  const solved = (() => {
    switch (unknownKey) {
      case 'p1x':
        return 2 * midX.value - p2x.value;
      case 'p1y':
        return 2 * midY.value - p2y.value;
      case 'p2x':
        return 2 * midX.value - p1x.value;
      case 'p2y':
        return 2 * midY.value - p1y.value;
      case 'mx':
        return (p1x.value + p2x.value) / 2;
      default:
        return (p1y.value + p2y.value) / 2;
    }
  })();

  const labelMap: Record<typeof unknownKey, string> = {
    p1x: 'x_1',
    p1y: 'y_1',
    p2x: 'x_2',
    p2y: 'y_2',
    mx: 'm_x',
    my: 'm_y',
  };
  return {
    evaluation: geometryResult(
      [{ label: labelMap[unknownKey], latex: formatNumber(solved) }],
      [],
      'geometry-coordinate',
    ),
  };
}

export function solveSlopeMissing(request: Extract<GeometryRequest, { kind: 'slopeSolveMissing' }>): SolveMissingResult {
  const slope = resolveScalar(request.slopeLatex, 'Slope');
  if (!slope.ok) {
    return { evaluation: geometryError(slope.error) };
  }
  const p1x = resolveCoordinateValue(request.p1.xLatex, 'P1 x-coordinate');
  if (!p1x.ok) {
    return { evaluation: geometryError(p1x.error) };
  }
  const p1y = resolveCoordinateValue(request.p1.yLatex, 'P1 y-coordinate');
  if (!p1y.ok) {
    return { evaluation: geometryError(p1y.error) };
  }
  const p2x = resolveCoordinateValue(request.p2.xLatex, 'P2 x-coordinate');
  if (!p2x.ok) {
    return { evaluation: geometryError(p2x.error) };
  }
  const p2y = resolveCoordinateValue(request.p2.yLatex, 'P2 y-coordinate');
  if (!p2y.ok) {
    return { evaluation: geometryError(p2y.error) };
  }

  const values = [
    ['p1x', p1x],
    ['p1y', p1y],
    ['p2x', p2x],
    ['p2y', p2y],
  ] as const;
  const unknownEntries = values.filter((entry) => entry[1].unknown);
  if (unknownEntries.length !== 1) {
    return { evaluation: geometryError('slope solve-missing requires exactly one unknown coordinate.') };
  }
  const unknownKey = unknownEntries[0][0];

  const yDiff = p2y.value - p1y.value;
  const m = slope.value;

  if ((unknownKey === 'p1x' || unknownKey === 'p2x') && Math.abs(m) < 1e-12) {
    if (Math.abs(yDiff) < 1e-9) {
      const variableLabel = unknownKey === 'p1x' ? 'x_1' : 'x_2';
      const equation =
        unknownKey === 'p1x'
          ? `(${formatNumber(p2y.value)}-${formatNumber(p1y.value)})/(${formatNumber(p2x.value)}-x)=0`
          : `(${formatNumber(p2y.value)}-${formatNumber(p1y.value)})/(x-${formatNumber(p1x.value)})=0`;
      return {
        evaluation: {
          error: 'This slope constraint leaves infinitely many x-values; add another condition to isolate one coordinate.',
          warnings: [`Equation handoff uses x to represent missing ${variableLabel}.`],
        },
        handoffEquationLatex: equation,
        handoffWarning: `x represents missing ${variableLabel}`,
      };
    }
    return { evaluation: geometryError('No real solution for this slope/point combination.') };
  }

  const solved = (() => {
    switch (unknownKey) {
      case 'p1y':
        return p2y.value - m * (p2x.value - p1x.value);
      case 'p2y':
        return p1y.value + m * (p2x.value - p1x.value);
      case 'p1x':
        return p2x.value - (p2y.value - p1y.value) / m;
      default:
        return p1x.value + (p2y.value - p1y.value) / m;
    }
  })();

  const labelMap: Record<typeof unknownKey, string> = {
    p1x: 'x_1',
    p1y: 'y_1',
    p2x: 'x_2',
    p2y: 'y_2',
  };
  return {
    evaluation: geometryResult(
      [
        { label: labelMap[unknownKey], latex: formatNumber(solved) },
        { label: 'm', latex: slope.normalizedLatex },
      ],
      [],
      'geometry-coordinate',
    ),
  };
}
