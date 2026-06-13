import type { GeometryRequest } from '../../../types/calculator';
import { formatNumber } from '../../display/format';
import {
  isUnknownLatex,
  resolvePositiveScalar,
} from '../resolvers';
import { geometryError } from '../shared';
import {
  solveCube,
  solveCuboid,
  solveRectangle,
  solveSquare,
} from '../shapes';
import type { SolveMissingResult } from './shared';

export function solveSquareMissing(request: Extract<GeometryRequest, { kind: 'squareSolveMissing' }>): SolveMissingResult {
  if (!isUnknownLatex(request.sideLatex)) {
    return { evaluation: geometryError('square solve-missing requires side=? in this milestone.') };
  }

  if (request.areaLatex) {
    const area = resolvePositiveScalar(request.areaLatex, 'Square area');
    if (!area.ok) {
      return { evaluation: geometryError(area.error) };
    }
    return { evaluation: solveSquare({ side: formatNumber(Math.sqrt(area.value)) }) };
  }
  if (request.perimeterLatex) {
    const perimeter = resolvePositiveScalar(request.perimeterLatex, 'Square perimeter');
    if (!perimeter.ok) {
      return { evaluation: geometryError(perimeter.error) };
    }
    return { evaluation: solveSquare({ side: formatNumber(perimeter.value / 4) }) };
  }
  if (request.diagonalLatex) {
    const diagonal = resolvePositiveScalar(request.diagonalLatex, 'Square diagonal');
    if (!diagonal.ok) {
      return { evaluation: geometryError(diagonal.error) };
    }
    return { evaluation: solveSquare({ side: formatNumber(diagonal.value / Math.SQRT2) }) };
  }

  return { evaluation: geometryError('square(side=?, ...) needs one known relation: area, perimeter, or diagonal.') };
}

export function solveCubeMissing(request: Extract<GeometryRequest, { kind: 'cubeSolveMissing' }>): SolveMissingResult {
  if (!isUnknownLatex(request.sideLatex)) {
    return { evaluation: geometryError('cube solve-missing requires side=? in this milestone.') };
  }

  if (request.volumeLatex) {
    const volume = resolvePositiveScalar(request.volumeLatex, 'Cube volume');
    if (!volume.ok) {
      return { evaluation: geometryError(volume.error) };
    }
    return { evaluation: solveCube({ side: formatNumber(Math.cbrt(volume.value)) }) };
  }
  if (request.surfaceAreaLatex) {
    const surfaceArea = resolvePositiveScalar(request.surfaceAreaLatex, 'Cube surface area');
    if (!surfaceArea.ok) {
      return { evaluation: geometryError(surfaceArea.error) };
    }
    return { evaluation: solveCube({ side: formatNumber(Math.sqrt(surfaceArea.value / 6)) }) };
  }
  if (request.diagonalLatex) {
    const diagonal = resolvePositiveScalar(request.diagonalLatex, 'Cube diagonal');
    if (!diagonal.ok) {
      return { evaluation: geometryError(diagonal.error) };
    }
    return { evaluation: solveCube({ side: formatNumber(diagonal.value / Math.sqrt(3)) }) };
  }

  return { evaluation: geometryError('cube(side=?, ...) needs one known relation: volume, surfaceArea, or diagonal.') };
}

export function solveRectangleMissing(request: Extract<GeometryRequest, { kind: 'rectangleSolveMissing' }>): SolveMissingResult {
  const unknown = request.unknown;
  const unknownLatex = unknown === 'width' ? request.widthLatex : request.heightLatex;
  const otherLatex = unknown === 'width' ? request.heightLatex : request.widthLatex;
  if (!isUnknownLatex(unknownLatex)) {
    return { evaluation: geometryError('rectangle solve-missing unknown marker must match width=? or height=?') };
  }
  const other = resolvePositiveScalar(otherLatex, `Rectangle ${unknown === 'width' ? 'height' : 'width'}`);
  if (!other.ok) {
    return { evaluation: geometryError(other.error) };
  }

  let solvedValue: number | null = null;
  if (request.areaLatex) {
    const area = resolvePositiveScalar(request.areaLatex, 'Rectangle area');
    if (!area.ok) {
      return { evaluation: geometryError(area.error) };
    }
    solvedValue = area.value / other.value;
  } else if (request.perimeterLatex) {
    const perimeter = resolvePositiveScalar(request.perimeterLatex, 'Rectangle perimeter');
    if (!perimeter.ok) {
      return { evaluation: geometryError(perimeter.error) };
    }
    solvedValue = perimeter.value / 2 - other.value;
  } else if (request.diagonalLatex) {
    const diagonal = resolvePositiveScalar(request.diagonalLatex, 'Rectangle diagonal');
    if (!diagonal.ok) {
      return { evaluation: geometryError(diagonal.error) };
    }
    const underRadical = diagonal.value ** 2 - other.value ** 2;
    if (underRadical < 0) {
      return { evaluation: geometryError('No real rectangle dimension fits this diagonal with the known side.') };
    }
    solvedValue = Math.sqrt(Math.max(underRadical, 0));
  }

  if (solvedValue === null) {
    return { evaluation: geometryError('rectangle solve-missing needs one known relation: area, perimeter, or diagonal.') };
  }
  if (!(solvedValue > 0)) {
    return { evaluation: geometryError('Solved rectangle dimension must be positive.') };
  }

  const width = unknown === 'width' ? solvedValue : other.value;
  const height = unknown === 'height' ? solvedValue : other.value;
  return { evaluation: solveRectangle({ width: formatNumber(width), height: formatNumber(height) }) };
}

export function solveCuboidMissing(request: Extract<GeometryRequest, { kind: 'cuboidSolveMissing' }>): SolveMissingResult {
  const unknown = request.unknown;
  const unknownLatex = unknown === 'length'
    ? request.lengthLatex
    : unknown === 'width'
      ? request.widthLatex
      : request.heightLatex;
  if (!isUnknownLatex(unknownLatex)) {
    return { evaluation: geometryError('cuboid solve-missing unknown marker must match length=?, width=?, or height=?') };
  }

  const length = unknown === 'length' ? null : resolvePositiveScalar(request.lengthLatex, 'Cuboid length');
  if (length && !length.ok) {
    return { evaluation: geometryError(length.error) };
  }
  const width = unknown === 'width' ? null : resolvePositiveScalar(request.widthLatex, 'Cuboid width');
  if (width && !width.ok) {
    return { evaluation: geometryError(width.error) };
  }
  const height = unknown === 'height' ? null : resolvePositiveScalar(request.heightLatex, 'Cuboid height');
  if (height && !height.ok) {
    return { evaluation: geometryError(height.error) };
  }

  const knownDimensions = [length?.value, width?.value, height?.value].filter(
    (value): value is number => Number.isFinite(value),
  );
  if (knownDimensions.length !== 2) {
    return { evaluation: geometryError('cuboid solve-missing needs two known dimensions before solving.') };
  }
  const [firstKnown, secondKnown] = knownDimensions;

  let solved = Number.NaN;
  if (request.volumeLatex) {
    const volume = resolvePositiveScalar(request.volumeLatex, 'Cuboid volume');
    if (!volume.ok) {
      return { evaluation: geometryError(volume.error) };
    }
    solved = volume.value / (firstKnown * secondKnown);
  } else if (request.diagonalLatex) {
    const diagonal = resolvePositiveScalar(request.diagonalLatex, 'Cuboid diagonal');
    if (!diagonal.ok) {
      return { evaluation: geometryError(diagonal.error) };
    }
    const underRadical = diagonal.value ** 2 - firstKnown ** 2 - secondKnown ** 2;
    if (underRadical < 0) {
      return { evaluation: geometryError('No real cuboid dimension fits this diagonal with the other two dimensions.') };
    }
    solved = Math.sqrt(Math.max(underRadical, 0));
  } else {
    return { evaluation: geometryError('cuboid solve-missing needs one known relation: volume or diagonal.') };
  }

  if (!(solved > 0)) {
    return { evaluation: geometryError('Solved cuboid dimension must be positive.') };
  }

  const resolvedLength = unknown === 'length' ? solved : length?.value ?? Number.NaN;
  const resolvedWidth = unknown === 'width' ? solved : width?.value ?? Number.NaN;
  const resolvedHeight = unknown === 'height' ? solved : height?.value ?? Number.NaN;
  return {
    evaluation: solveCuboid({
      length: formatNumber(resolvedLength),
      width: formatNumber(resolvedWidth),
      height: formatNumber(resolvedHeight),
    }),
  };
}
