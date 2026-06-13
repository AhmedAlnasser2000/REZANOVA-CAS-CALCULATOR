import type { GeometryRequest } from '../../../types/calculator';
import { formatNumber } from '../../display/format';
import { convertAngle } from '../../trigonometry/angles';
import { solveArcSector, solveCircle } from '../circles';
import {
  isUnknownLatex,
  resolvePositiveScalar,
} from '../resolvers';
import { geometryError } from '../shared';
import {
  solveCone,
  solveCylinder,
  solveSphere,
} from '../shapes';
import type { SolveMissingResult } from './shared';

export function solveCircleMissing(request: Extract<GeometryRequest, { kind: 'circleSolveMissing' }>): SolveMissingResult {
  if (!isUnknownLatex(request.radiusLatex)) {
    return { evaluation: geometryError('circle solve-missing requires radius=? in this milestone.') };
  }

  if (request.diameterLatex) {
    const diameter = resolvePositiveScalar(request.diameterLatex, 'Circle diameter');
    if (!diameter.ok) {
      return { evaluation: geometryError(diameter.error) };
    }
    return { evaluation: solveCircle({ radius: formatNumber(diameter.value / 2) }) };
  }
  if (request.circumferenceLatex) {
    const circumference = resolvePositiveScalar(request.circumferenceLatex, 'Circle circumference');
    if (!circumference.ok) {
      return { evaluation: geometryError(circumference.error) };
    }
    return { evaluation: solveCircle({ radius: formatNumber(circumference.value / (2 * Math.PI)) }) };
  }
  if (request.areaLatex) {
    const area = resolvePositiveScalar(request.areaLatex, 'Circle area');
    if (!area.ok) {
      return { evaluation: geometryError(area.error) };
    }
    return { evaluation: solveCircle({ radius: formatNumber(Math.sqrt(area.value / Math.PI)) }) };
  }

  return { evaluation: geometryError('circle(radius=?, ...) needs one known relation: diameter, circumference, or area.') };
}

export function solveSphereMissing(request: Extract<GeometryRequest, { kind: 'sphereSolveMissing' }>): SolveMissingResult {
  if (!isUnknownLatex(request.radiusLatex)) {
    return { evaluation: geometryError('sphere solve-missing requires radius=? in this milestone.') };
  }

  if (request.volumeLatex) {
    const volume = resolvePositiveScalar(request.volumeLatex, 'Sphere volume');
    if (!volume.ok) {
      return { evaluation: geometryError(volume.error) };
    }
    return { evaluation: solveSphere({ radius: formatNumber(Math.cbrt((3 * volume.value) / (4 * Math.PI))) }) };
  }
  if (request.surfaceAreaLatex) {
    const surfaceArea = resolvePositiveScalar(request.surfaceAreaLatex, 'Sphere surface area');
    if (!surfaceArea.ok) {
      return { evaluation: geometryError(surfaceArea.error) };
    }
    return { evaluation: solveSphere({ radius: formatNumber(Math.sqrt(surfaceArea.value / (4 * Math.PI))) }) };
  }

  return { evaluation: geometryError('sphere(radius=?, ...) needs one known relation: volume or surfaceArea.') };
}

export function solveCylinderMissing(request: Extract<GeometryRequest, { kind: 'cylinderSolveMissing' }>): SolveMissingResult {
  const volume = resolvePositiveScalar(request.volumeLatex, 'Cylinder volume');
  if (!volume.ok) {
    return { evaluation: geometryError(volume.error) };
  }

  if (request.unknown === 'radius') {
    if (!isUnknownLatex(request.radiusLatex)) {
      return { evaluation: geometryError('cylinder solve-missing radius workflow requires radius=?') };
    }
    const height = resolvePositiveScalar(request.heightLatex, 'Cylinder height');
    if (!height.ok) {
      return { evaluation: geometryError(height.error) };
    }
    return { evaluation: solveCylinder({ radius: formatNumber(Math.sqrt(volume.value / (Math.PI * height.value))), height: height.normalizedLatex }) };
  }

  if (!isUnknownLatex(request.heightLatex)) {
    return { evaluation: geometryError('cylinder solve-missing height workflow requires height=?') };
  }
  const radius = resolvePositiveScalar(request.radiusLatex, 'Cylinder radius');
  if (!radius.ok) {
    return { evaluation: geometryError(radius.error) };
  }
  return { evaluation: solveCylinder({ radius: radius.normalizedLatex, height: formatNumber(volume.value / (Math.PI * radius.value ** 2)) }) };
}

export function solveConeMissing(request: Extract<GeometryRequest, { kind: 'coneSolveMissing' }>): SolveMissingResult {
  if (request.unknown === 'radius') {
    if (!isUnknownLatex(request.radiusLatex)) {
      return { evaluation: geometryError('cone solve-missing radius workflow requires radius=?') };
    }
    const height = resolvePositiveScalar(request.heightLatex, 'Cone height');
    if (!height.ok) {
      return { evaluation: geometryError(height.error) };
    }
    if (!request.volumeLatex) {
      return { evaluation: geometryError('cone(radius=?, ...) needs a known volume value.') };
    }
    const volume = resolvePositiveScalar(request.volumeLatex, 'Cone volume');
    if (!volume.ok) {
      return { evaluation: geometryError(volume.error) };
    }
    const solvedRadius = Math.sqrt((3 * volume.value) / (Math.PI * height.value));
    if (!(solvedRadius > 0)) {
      return { evaluation: geometryError('No real cone radius satisfies this height and volume pair.') };
    }
    return {
      evaluation: solveCone({
        radius: formatNumber(solvedRadius),
        height: height.normalizedLatex,
        slantHeight: '',
      }),
    };
  }

  const radius = resolvePositiveScalar(request.radiusLatex, 'Cone radius');
  if (!radius.ok) {
    return { evaluation: geometryError(radius.error) };
  }
  if (request.unknown === 'height') {
    if (!isUnknownLatex(request.heightLatex)) {
      return { evaluation: geometryError('cone solve-missing height workflow requires height=?') };
    }
    if (request.volumeLatex) {
      const volume = resolvePositiveScalar(request.volumeLatex, 'Cone volume');
      if (!volume.ok) {
        return { evaluation: geometryError(volume.error) };
      }
      const solvedHeight = (3 * volume.value) / (Math.PI * radius.value ** 2);
      if (!(solvedHeight > 0)) {
        return { evaluation: geometryError('No real cone height satisfies this radius and volume pair.') };
      }
      return {
        evaluation: solveCone({
          radius: radius.normalizedLatex,
          height: formatNumber(solvedHeight),
          slantHeight: '',
        }),
      };
    }
    const slantHeight = resolvePositiveScalar(request.slantHeightLatex, 'Cone slant height');
    if (!slantHeight.ok) {
      return { evaluation: geometryError(slantHeight.error) };
    }
    if (!(slantHeight.value > radius.value)) {
      return { evaluation: geometryError('No real cone height exists because slant height must be longer than radius.') };
    }
    const solvedHeight = Math.sqrt(slantHeight.value ** 2 - radius.value ** 2);
    return {
      evaluation: solveCone({
        radius: radius.normalizedLatex,
        height: formatNumber(solvedHeight),
        slantHeight: slantHeight.normalizedLatex,
      }),
    };
  }

  if (!isUnknownLatex(request.slantHeightLatex)) {
    return { evaluation: geometryError('cone solve-missing slant-height workflow requires slantHeight=?') };
  }
  const height = resolvePositiveScalar(request.heightLatex, 'Cone height');
  if (!height.ok) {
    return { evaluation: geometryError(height.error) };
  }
  const solvedSlantHeight = Math.sqrt(radius.value ** 2 + height.value ** 2);
  return {
    evaluation: solveCone({
      radius: radius.normalizedLatex,
      height: height.normalizedLatex,
      slantHeight: formatNumber(solvedSlantHeight),
    }),
  };
}

export function solveArcSectorMissing(request: Extract<GeometryRequest, { kind: 'arcSectorSolveMissing' }>): SolveMissingResult {
  const unit = request.angleUnit;
  if (!['deg', 'rad', 'grad'].includes(unit)) {
    return { evaluation: geometryError('Arc/sector solve-missing requires unit=deg, unit=rad, or unit=grad.') };
  }

  if (request.unknown === 'radius') {
    if (!isUnknownLatex(request.radiusLatex)) {
      return { evaluation: geometryError('arcSector solve-missing radius workflow requires radius=?') };
    }
    const angle = resolvePositiveScalar(request.angleLatex, 'Central angle');
    if (!angle.ok) {
      return { evaluation: geometryError(angle.error) };
    }
    const angleRadians = convertAngle(angle.value, unit, 'rad');
    let solvedRadius = Number.NaN;
    if (request.arcLatex) {
      const arc = resolvePositiveScalar(request.arcLatex, 'Arc length');
      if (!arc.ok) {
        return { evaluation: geometryError(arc.error) };
      }
      solvedRadius = arc.value / angleRadians;
    } else if (request.sectorLatex) {
      const sector = resolvePositiveScalar(request.sectorLatex, 'Sector area');
      if (!sector.ok) {
        return { evaluation: geometryError(sector.error) };
      }
      solvedRadius = Math.sqrt((2 * sector.value) / angleRadians);
    } else {
      return { evaluation: geometryError('arcSector solve-missing needs one known relation: arc or sector.') };
    }
    if (!(solvedRadius > 0)) {
      return { evaluation: geometryError('No real positive radius satisfies this arc/sector relation.') };
    }
    return {
      evaluation: solveArcSector({
        radius: formatNumber(solvedRadius),
        angle: angle.normalizedLatex,
        angleUnit: unit,
      }),
    };
  }

  if (!isUnknownLatex(request.angleLatex)) {
    return { evaluation: geometryError('arcSector solve-missing angle workflow requires angle=?') };
  }
  const radius = resolvePositiveScalar(request.radiusLatex, 'Sector radius');
  if (!radius.ok) {
    return { evaluation: geometryError(radius.error) };
  }
  let solvedAngleRadians = Number.NaN;
  if (request.arcLatex) {
    const arc = resolvePositiveScalar(request.arcLatex, 'Arc length');
    if (!arc.ok) {
      return { evaluation: geometryError(arc.error) };
    }
    solvedAngleRadians = arc.value / radius.value;
  } else if (request.sectorLatex) {
    const sector = resolvePositiveScalar(request.sectorLatex, 'Sector area');
    if (!sector.ok) {
      return { evaluation: geometryError(sector.error) };
    }
    solvedAngleRadians = (2 * sector.value) / (radius.value ** 2);
  } else {
    return { evaluation: geometryError('arcSector solve-missing needs one known relation: arc or sector.') };
  }
  const solvedAngle = convertAngle(solvedAngleRadians, 'rad', unit);
  if (!(solvedAngle > 0)) {
    return { evaluation: geometryError('No real positive angle satisfies this arc/sector relation.') };
  }
  return {
    evaluation: solveArcSector({
      radius: radius.normalizedLatex,
      angle: formatNumber(solvedAngle),
      angleUnit: unit,
    }),
  };
}
