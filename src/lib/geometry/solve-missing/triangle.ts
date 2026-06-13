import type { GeometryRequest } from '../../../types/calculator';
import { finiteBranchReadbackMetadata } from '../../display/branch-readback';
import { formatNumber } from '../../display/format';
import {
  isUnknownLatex,
  resolvePositiveScalar,
} from '../resolvers';
import { geometryError, geometryResult } from '../shared';
import { solveTriangleArea, solveTriangleHeron } from '../triangles';
import type { SolveMissingResult } from './shared';

export function solveTriangleAreaMissing(request: Extract<GeometryRequest, { kind: 'triangleAreaSolveMissing' }>): SolveMissingResult {
  const area = resolvePositiveScalar(request.areaLatex, 'Triangle area');
  if (!area.ok) {
    return { evaluation: geometryError(area.error) };
  }

  if (request.unknown === 'base') {
    if (!isUnknownLatex(request.baseLatex)) {
      return { evaluation: geometryError('triangleArea solve-missing base workflow requires base=?') };
    }
    const height = resolvePositiveScalar(request.heightLatex, 'Triangle height');
    if (!height.ok) {
      return { evaluation: geometryError(height.error) };
    }
    return { evaluation: solveTriangleArea({ base: formatNumber((2 * area.value) / height.value), height: height.normalizedLatex }) };
  }

  if (!isUnknownLatex(request.heightLatex)) {
    return { evaluation: geometryError('triangleArea solve-missing height workflow requires height=?') };
  }
  const base = resolvePositiveScalar(request.baseLatex, 'Triangle base');
  if (!base.ok) {
    return { evaluation: geometryError(base.error) };
  }
  return { evaluation: solveTriangleArea({ base: base.normalizedLatex, height: formatNumber((2 * area.value) / base.value) }) };
}

export function solveTriangleHeronMissing(
  request: Extract<GeometryRequest, { kind: 'triangleHeronSolveMissing' }>,
): SolveMissingResult {
  const area = resolvePositiveScalar(request.areaLatex, 'Triangle area');
  if (!area.ok) {
    return { evaluation: geometryError(area.error) };
  }
  const unknown = request.unknown;
  const unknownLatex = unknown === 'a' ? request.aLatex : unknown === 'b' ? request.bLatex : request.cLatex;
  if (!isUnknownLatex(unknownLatex)) {
    return { evaluation: geometryError('triangleHeron solve-missing unknown marker must match side a=?, b=?, or c=?') };
  }

  const sideA = unknown === 'a' ? null : resolvePositiveScalar(request.aLatex, 'Triangle side a');
  if (sideA && !sideA.ok) {
    return { evaluation: geometryError(sideA.error) };
  }
  const sideB = unknown === 'b' ? null : resolvePositiveScalar(request.bLatex, 'Triangle side b');
  if (sideB && !sideB.ok) {
    return { evaluation: geometryError(sideB.error) };
  }
  const sideC = unknown === 'c' ? null : resolvePositiveScalar(request.cLatex, 'Triangle side c');
  if (sideC && !sideC.ok) {
    return { evaluation: geometryError(sideC.error) };
  }

  const knownOne = sideA?.value ?? sideB?.value ?? sideC?.value ?? Number.NaN;
  const knownTwo = sideA === null
    ? (sideB?.value ?? sideC?.value ?? Number.NaN)
    : sideB === null
      ? (sideA?.value ?? sideC?.value ?? Number.NaN)
      : (sideA?.value ?? sideB?.value ?? Number.NaN);

  // Heron inverse with unknown side x:
  // x^4 - 2(u^2+v^2)x^2 + (u^2-v^2)^2 + 16A^2 = 0
  const u2 = knownOne ** 2;
  const v2 = knownTwo ** 2;
  const coefficientB = -2 * (u2 + v2);
  const coefficientC = (u2 - v2) ** 2 + 16 * area.value ** 2;
  const discriminant = coefficientB ** 2 - 4 * coefficientC;
  if (discriminant < 0) {
    return { evaluation: geometryError('No real side length satisfies this Heron area constraint with the known sides.') };
  }
  const sqrtDiscriminant = Math.sqrt(Math.max(discriminant, 0));
  const tRoots = [
    (-coefficientB + sqrtDiscriminant) / 2,
    (-coefficientB - sqrtDiscriminant) / 2,
  ];
  const candidates = tRoots
    .filter((value) => value > 0)
    .map((value) => Math.sqrt(value))
    .filter((value, index, all) => all.findIndex((candidate) => Math.abs(candidate - value) < 1e-9) === index)
    .filter((candidate) => (
      candidate + knownOne > knownTwo + 1e-9
      && candidate + knownTwo > knownOne + 1e-9
      && knownOne + knownTwo > candidate + 1e-9
    ));

  if (candidates.length === 0) {
    return { evaluation: geometryError('No real side length satisfies this Heron area constraint with the known sides.') };
  }
  if (candidates.length === 1) {
    const resolvedA = unknown === 'a' ? candidates[0] : sideA?.value ?? Number.NaN;
    const resolvedB = unknown === 'b' ? candidates[0] : sideB?.value ?? Number.NaN;
    const resolvedC = unknown === 'c' ? candidates[0] : sideC?.value ?? Number.NaN;
    return {
      evaluation: solveTriangleHeron({
        a: formatNumber(resolvedA),
        b: formatNumber(resolvedB),
        c: formatNumber(resolvedC),
      }),
    };
  }

  const unknownLabel = unknown;
  const candidateBranches = candidates.slice(0, 2).map((candidate) => formatNumber(candidate));
  const evaluation = geometryResult(
    [
      { label: unknownLabel === 'a' ? 'a^{(1)}' : unknownLabel === 'b' ? 'b^{(1)}' : 'c^{(1)}', latex: candidateBranches[0] },
      { label: unknownLabel === 'a' ? 'a^{(2)}' : unknownLabel === 'b' ? 'b^{(2)}' : 'c^{(2)}', latex: candidateBranches[1] },
      { label: 'A', latex: area.normalizedLatex },
    ],
    ['Two real side-length branches satisfy this Heron area constraint.'],
    'geometry-formula',
  );
  return {
    evaluation: {
      ...evaluation,
      branchReadback: finiteBranchReadbackMetadata({
        targetLatex: unknownLabel,
        relationLatex: '\\in',
        branchesLatex: candidateBranches,
        source: 'geometry-heron-solve-missing',
      }),
    },
  };
}
