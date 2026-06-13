import type {
  AngleUnit,
  CoreDraftStyle,
  GeometryParseResult,
} from '../../../types/calculator';
import {
  countUnknownValues,
  familyHint,
  isUnknownValue,
  parseAssignments,
  parseLineForm,
  parsePoint,
  type GeometryParseOptions,
} from './shared';

export function parseShorthand(source: string, options: GeometryParseOptions): GeometryParseResult {
  const assignments = parseAssignments(source);
  if (!assignments) {
    return {
      ok: false,
      error: 'Enter a supported Geometry request or use a guided tool to seed one.',
    };
  }

  const hint = familyHint(options.screenHint);
  const style: CoreDraftStyle = 'shorthand';
  const sideLatex = assignments.get('s') ?? assignments.get('side');
  const widthLatex = assignments.get('w') ?? assignments.get('width');
  const heightLatex = assignments.get('h') ?? assignments.get('height');
  const radiusLatex = assignments.get('r') ?? assignments.get('radius');
  const areaLatex = assignments.get('area');
  const perimeterLatex = assignments.get('perimeter') ?? assignments.get('p');
  const diagonalLatex = assignments.get('diagonal') ?? assignments.get('d');
  const diameterLatex = assignments.get('diameter') ?? assignments.get('d');
  const circumferenceLatex = assignments.get('circumference') ?? assignments.get('c');
  const arcLatex = assignments.get('arc');
  const sectorLatex = assignments.get('sector');
  const volumeLatex = assignments.get('volume') ?? assignments.get('v');
  const surfaceAreaLatex = assignments.get('surfacearea') ?? assignments.get('sa') ?? assignments.get('surface');
  const angleValue = assignments.get('theta') ?? assignments.get('angle');
  const form = parseLineForm(assignments.get('form'));
  const p1 = parsePoint(assignments.get('p1') ?? '');
  const p2 = parsePoint(assignments.get('p2') ?? '');
  const hasWidthKey = assignments.has('width') || assignments.has('w');
  const rawL = assignments.get('l');
  const lengthLatex = assignments.get('length') ?? (hasWidthKey ? rawL : undefined);
  const slantHeightLatex =
    assignments.get('slantheight')
    ?? assignments.get('slant')
    ?? (radiusLatex && !hasWidthKey ? rawL : undefined);
  const explicitBaseLatex = assignments.get('base');
  const aLatex = assignments.get('a');
  const bLatex = assignments.get('b');
  const cLatex = assignments.get('c');
  const baseLatex = explicitBaseLatex ?? (!aLatex && !cLatex ? bLatex : undefined);
  const distanceLatex = assignments.get('distance') ?? assignments.get('d');
  const midLatex = assignments.get('mid') ?? assignments.get('m');
  const mid = parsePoint(midLatex ?? '');
  const slopeLatex = assignments.get('slope') ?? assignments.get('m');
  const formulaUnknownCount = countUnknownValues([
    sideLatex,
    widthLatex,
    heightLatex,
    lengthLatex,
    slantHeightLatex,
    radiusLatex,
    aLatex,
    bLatex,
    cLatex,
    areaLatex,
    arcLatex,
    sectorLatex,
    perimeterLatex,
    diagonalLatex,
    diameterLatex,
    circumferenceLatex,
    volumeLatex,
    surfaceAreaLatex,
    baseLatex,
  ]);

  const squareRequest =
    sideLatex ? { kind: 'square' as const, sideLatex } : null;
  const rectangleRequest =
    widthLatex && heightLatex
      ? { kind: 'rectangle' as const, widthLatex, heightLatex }
      : null;
  const cubeRequest =
    sideLatex ? { kind: 'cube' as const, sideLatex } : null;
  const cuboidRequest =
    lengthLatex && widthLatex && heightLatex
      ? { kind: 'cuboid' as const, lengthLatex, widthLatex, heightLatex }
      : null;
  const cylinderRequest =
    radiusLatex && heightLatex
      ? { kind: 'cylinder' as const, radiusLatex, heightLatex }
      : null;
  const coneRequest =
    radiusLatex && (heightLatex || slantHeightLatex)
      ? {
          kind: 'cone' as const,
          radiusLatex,
          ...(heightLatex ? { heightLatex } : {}),
          ...(slantHeightLatex ? { slantHeightLatex } : {}),
        }
      : null;
  const sphereRequest =
    radiusLatex ? { kind: 'sphere' as const, radiusLatex } : null;
  const triangleAreaRequest =
    baseLatex && heightLatex
      ? { kind: 'triangleArea' as const, baseLatex, heightLatex }
      : null;
  const triangleHeronRequest =
    aLatex && bLatex && cLatex
      ? { kind: 'triangleHeron' as const, aLatex, bLatex, cLatex }
      : null;

  if (formulaUnknownCount > 1) {
    return {
      ok: false,
      error: 'Use exactly one ? unknown for Geometry solve-missing requests.',
    };
  }

  if (options.screenHint === 'square' && isUnknownValue(sideLatex)) {
    const knownEntries = [
      ['area', areaLatex],
      ['perimeter', perimeterLatex],
      ['diagonal', diagonalLatex],
    ].filter((entry): entry is [string, string] => Boolean(entry[1]) && !isUnknownValue(entry[1]));
    if (knownEntries.length !== 1) {
      return {
        ok: false,
        error: 'square solve-missing needs side=? and exactly one known relation: area, perimeter, or diagonal.',
      };
    }
    return {
      ok: true,
      request: {
        kind: 'squareSolveMissing',
        sideLatex,
        ...(knownEntries[0][0] === 'area' ? { areaLatex: knownEntries[0][1] } : {}),
        ...(knownEntries[0][0] === 'perimeter' ? { perimeterLatex: knownEntries[0][1] } : {}),
        ...(knownEntries[0][0] === 'diagonal' ? { diagonalLatex: knownEntries[0][1] } : {}),
      },
      style,
    };
  }

  if (options.screenHint === 'rectangle' && (isUnknownValue(widthLatex) || isUnknownValue(heightLatex))) {
    const unknown = isUnknownValue(widthLatex) ? 'width' : 'height';
    const knownSide = unknown === 'width' ? heightLatex : widthLatex;
    if (!knownSide || isUnknownValue(knownSide)) {
      return { ok: false, error: 'rectangle solve-missing needs the other side as a known value.' };
    }
    const knownEntries = [
      ['area', areaLatex],
      ['perimeter', perimeterLatex],
      ['diagonal', diagonalLatex],
    ].filter((entry): entry is [string, string] => Boolean(entry[1]) && !isUnknownValue(entry[1]));
    if (knownEntries.length !== 1) {
      return { ok: false, error: 'rectangle solve-missing needs exactly one known relation: area, perimeter, or diagonal.' };
    }
    return {
      ok: true,
      request: {
        kind: 'rectangleSolveMissing',
        widthLatex: widthLatex ?? '?',
        heightLatex: heightLatex ?? '?',
        unknown,
        ...(knownEntries[0][0] === 'area' ? { areaLatex: knownEntries[0][1] } : {}),
        ...(knownEntries[0][0] === 'perimeter' ? { perimeterLatex: knownEntries[0][1] } : {}),
        ...(knownEntries[0][0] === 'diagonal' ? { diagonalLatex: knownEntries[0][1] } : {}),
      },
      style,
    };
  }

  if (options.screenHint === 'circle' && isUnknownValue(radiusLatex)) {
    const knownEntries = [
      ['diameter', diameterLatex],
      ['circumference', circumferenceLatex],
      ['area', areaLatex],
    ].filter((entry): entry is [string, string] => Boolean(entry[1]) && !isUnknownValue(entry[1]));
    if (knownEntries.length !== 1) {
      return { ok: false, error: 'circle solve-missing needs radius=? and exactly one known relation: diameter, circumference, or area.' };
    }
    return {
      ok: true,
      request: {
        kind: 'circleSolveMissing',
        radiusLatex,
        ...(knownEntries[0][0] === 'diameter' ? { diameterLatex: knownEntries[0][1] } : {}),
        ...(knownEntries[0][0] === 'circumference' ? { circumferenceLatex: knownEntries[0][1] } : {}),
        ...(knownEntries[0][0] === 'area' ? { areaLatex: knownEntries[0][1] } : {}),
      },
      style,
    };
  }

  if (options.screenHint === 'cube' && isUnknownValue(sideLatex)) {
    const knownEntries = [
      ['volume', volumeLatex],
      ['surfaceArea', surfaceAreaLatex],
      ['diagonal', diagonalLatex],
    ].filter((entry): entry is [string, string] => Boolean(entry[1]) && !isUnknownValue(entry[1]));
    if (knownEntries.length !== 1) {
      return { ok: false, error: 'cube solve-missing needs side=? and exactly one known relation: volume, surfaceArea, or diagonal.' };
    }
    return {
      ok: true,
      request: {
        kind: 'cubeSolveMissing',
        sideLatex,
        ...(knownEntries[0][0] === 'volume' ? { volumeLatex: knownEntries[0][1] } : {}),
        ...(knownEntries[0][0] === 'surfaceArea' ? { surfaceAreaLatex: knownEntries[0][1] } : {}),
        ...(knownEntries[0][0] === 'diagonal' ? { diagonalLatex: knownEntries[0][1] } : {}),
      },
      style,
    };
  }

  if (options.screenHint === 'sphere' && isUnknownValue(radiusLatex)) {
    const knownEntries = [
      ['volume', volumeLatex],
      ['surfaceArea', surfaceAreaLatex],
    ].filter((entry): entry is [string, string] => Boolean(entry[1]) && !isUnknownValue(entry[1]));
    if (knownEntries.length !== 1) {
      return { ok: false, error: 'sphere solve-missing needs radius=? and exactly one known relation: volume or surfaceArea.' };
    }
    return {
      ok: true,
      request: {
        kind: 'sphereSolveMissing',
        radiusLatex,
        ...(knownEntries[0][0] === 'volume' ? { volumeLatex: knownEntries[0][1] } : {}),
        ...(knownEntries[0][0] === 'surfaceArea' ? { surfaceAreaLatex: knownEntries[0][1] } : {}),
      },
      style,
    };
  }

  if (options.screenHint === 'triangleArea' && (isUnknownValue(baseLatex) || isUnknownValue(heightLatex))) {
    if (!areaLatex || isUnknownValue(areaLatex)) {
      return { ok: false, error: 'triangleArea solve-missing needs a known area value.' };
    }
    return {
      ok: true,
      request: {
        kind: 'triangleAreaSolveMissing',
        baseLatex: baseLatex ?? '?',
        heightLatex: heightLatex ?? '?',
        areaLatex,
        unknown: isUnknownValue(baseLatex) ? 'base' : 'height',
      },
      style,
    };
  }

  if (options.screenHint === 'cylinder' && (isUnknownValue(radiusLatex) || isUnknownValue(heightLatex))) {
    if (!volumeLatex || isUnknownValue(volumeLatex)) {
      return { ok: false, error: 'cylinder solve-missing needs a known volume value.' };
    }
    const unknown = isUnknownValue(radiusLatex) ? 'radius' : 'height';
    const knownOther = unknown === 'radius' ? heightLatex : radiusLatex;
    if (!knownOther || isUnknownValue(knownOther)) {
      return { ok: false, error: 'cylinder solve-missing needs the other dimension as a known value.' };
    }
    return {
      ok: true,
      request: {
        kind: 'cylinderSolveMissing',
        radiusLatex: radiusLatex ?? '?',
        heightLatex: heightLatex ?? '?',
        volumeLatex,
        unknown,
      },
      style,
    };
  }

  if (options.screenHint === 'cone') {
    const unknownCount = countUnknownValues([radiusLatex, heightLatex, slantHeightLatex, volumeLatex]);
    if (unknownCount > 1) {
      return { ok: false, error: 'Use exactly one ? unknown in cone solve-missing requests.' };
    }
    if (unknownCount === 1) {
      const unknown = isUnknownValue(radiusLatex)
        ? 'radius'
        : isUnknownValue(heightLatex)
          ? 'height'
          : isUnknownValue(slantHeightLatex)
            ? 'slantHeight'
            : null;
      if (!unknown) {
        return { ok: false, error: 'cone solve-missing supports ? on radius, height, or slantHeight only.' };
      }
      if (unknown === 'radius') {
        if (!heightLatex || isUnknownValue(heightLatex) || !volumeLatex || isUnknownValue(volumeLatex)) {
          return { ok: false, error: 'cone(radius=?, ...) needs known height and volume.' };
        }
      } else if (unknown === 'height') {
        const hasVolume = Boolean(volumeLatex) && !isUnknownValue(volumeLatex);
        const hasSlant = Boolean(slantHeightLatex) && !isUnknownValue(slantHeightLatex);
        if (!radiusLatex || isUnknownValue(radiusLatex)) {
          return { ok: false, error: 'cone(height=?, ...) needs a known radius.' };
        }
        if (Number(hasVolume) + Number(hasSlant) !== 1) {
          return { ok: false, error: 'cone(height=?, ...) needs exactly one known relation: volume or slantHeight.' };
        }
      } else if (!radiusLatex || isUnknownValue(radiusLatex) || !heightLatex || isUnknownValue(heightLatex)) {
        return { ok: false, error: 'cone(slantHeight=?, ...) needs known radius and height.' };
      }
      return {
        ok: true,
        request: {
          kind: 'coneSolveMissing',
          radiusLatex: radiusLatex ?? '?',
          heightLatex: heightLatex ?? '?',
          slantHeightLatex: slantHeightLatex ?? '?',
          ...(volumeLatex && !isUnknownValue(volumeLatex) ? { volumeLatex } : {}),
          unknown,
        },
        style,
      };
    }
  }

  if (options.screenHint === 'cuboid') {
    const unknownCount = countUnknownValues([lengthLatex, widthLatex, heightLatex, volumeLatex, diagonalLatex]);
    if (unknownCount > 1) {
      return { ok: false, error: 'Use exactly one ? unknown in cuboid solve-missing requests.' };
    }
    if (unknownCount === 1) {
      const unknown = isUnknownValue(lengthLatex)
        ? 'length'
        : isUnknownValue(widthLatex)
          ? 'width'
          : isUnknownValue(heightLatex)
            ? 'height'
            : null;
      if (!unknown) {
        return { ok: false, error: 'cuboid solve-missing supports ? on length, width, or height only.' };
      }
      const knownDimensions = [
        ['length', lengthLatex],
        ['width', widthLatex],
        ['height', heightLatex],
      ]
        .filter((entry) => entry[0] !== unknown)
        .every((entry) => Boolean(entry[1]) && !isUnknownValue(entry[1]));
      if (!knownDimensions) {
        return { ok: false, error: 'cuboid solve-missing needs the other two dimensions as known values.' };
      }
      const knownEntries = [
        ['volume', volumeLatex],
        ['diagonal', diagonalLatex],
      ].filter((entry): entry is [string, string] => Boolean(entry[1]) && !isUnknownValue(entry[1]));
      if (knownEntries.length !== 1) {
        return { ok: false, error: 'cuboid solve-missing needs exactly one known relation: volume or diagonal.' };
      }
      return {
        ok: true,
        request: {
          kind: 'cuboidSolveMissing',
          lengthLatex: lengthLatex ?? '?',
          widthLatex: widthLatex ?? '?',
          heightLatex: heightLatex ?? '?',
          unknown,
          ...(knownEntries[0][0] === 'volume' ? { volumeLatex: knownEntries[0][1] } : {}),
          ...(knownEntries[0][0] === 'diagonal' ? { diagonalLatex: knownEntries[0][1] } : {}),
        },
        style,
      };
    }
  }

  if (options.screenHint === 'arcSector' && (isUnknownValue(radiusLatex) || isUnknownValue(angleValue))) {
    const unknown = isUnknownValue(radiusLatex) ? 'radius' : 'angle';
    const knownEntries = [
      ['arc', arcLatex],
      ['sector', sectorLatex],
    ].filter((entry): entry is [string, string] => Boolean(entry[1]) && !isUnknownValue(entry[1]));
    if (knownEntries.length !== 1) {
      return { ok: false, error: 'arcSector solve-missing needs exactly one known relation: arc or sector.' };
    }
    const angleUnit = (assignments.get('unit') ?? assignments.get('angleunit') ?? 'deg').toLowerCase() as AngleUnit;
    if (!['deg', 'rad', 'grad'].includes(angleUnit)) {
      return { ok: false, error: 'Use unit=deg, unit=rad, or unit=grad with arcSector solve-missing requests.' };
    }
    return {
      ok: true,
      request: {
        kind: 'arcSectorSolveMissing',
        radiusLatex: radiusLatex ?? '?',
        angleLatex: angleValue ?? '?',
        angleUnit,
        unknown,
        ...(knownEntries[0][0] === 'arc' ? { arcLatex: knownEntries[0][1] } : {}),
        ...(knownEntries[0][0] === 'sector' ? { sectorLatex: knownEntries[0][1] } : {}),
      },
      style,
    };
  }

  if (options.screenHint === 'triangleHeron' && (isUnknownValue(aLatex) || isUnknownValue(bLatex) || isUnknownValue(cLatex))) {
    if (!areaLatex || isUnknownValue(areaLatex)) {
      return { ok: false, error: 'triangleHeron solve-missing needs a known area value.' };
    }
    const unknown = isUnknownValue(aLatex)
      ? 'a'
      : isUnknownValue(bLatex)
        ? 'b'
        : isUnknownValue(cLatex)
          ? 'c'
          : null;
    if (!unknown) {
      return { ok: false, error: 'triangleHeron solve-missing supports ? on side a, b, or c only.' };
    }
    const knownSides = [aLatex, bLatex, cLatex].filter((value) => !isUnknownValue(value ?? ''));
    if (knownSides.length !== 2 || knownSides.some((value) => !value)) {
      return { ok: false, error: 'triangleHeron solve-missing needs the other two side values as known numbers.' };
    }
    return {
      ok: true,
      request: {
        kind: 'triangleHeronSolveMissing',
        aLatex: aLatex ?? '?',
        bLatex: bLatex ?? '?',
        cLatex: cLatex ?? '?',
        areaLatex,
        unknown,
      },
      style,
    };
  }

  if (p1 && p2) {
    const pointUnknownCount = countUnknownValues([
      p1.xLatex,
      p1.yLatex,
      p2.xLatex,
      p2.yLatex,
    ]);
    if (pointUnknownCount > 1) {
      return {
        ok: false,
        error: 'Use exactly one ? unknown in coordinate solve-missing requests.',
      };
    }

    if (pointUnknownCount === 1 && options.screenHint === 'distance') {
      if (!distanceLatex || isUnknownValue(distanceLatex)) {
        return {
          ok: false,
          error: 'distance solve-missing needs a known distance value.',
        };
      }
      return {
        ok: true,
        request: { kind: 'distanceSolveMissing', p1, p2, distanceLatex },
        style,
      };
    }

    if (pointUnknownCount === 1 && options.screenHint === 'midpoint') {
      if (!mid || isUnknownValue(mid.xLatex) || isUnknownValue(mid.yLatex)) {
        return {
          ok: false,
          error: 'midpoint solve-missing needs mid=(x,y) with known values.',
        };
      }
      return {
        ok: true,
        request: { kind: 'midpointSolveMissing', p1, p2, mid },
        style,
      };
    }

    if (pointUnknownCount === 1 && options.screenHint === 'slope') {
      if (!slopeLatex || isUnknownValue(slopeLatex)) {
        return {
          ok: false,
          error: 'slope solve-missing needs a known slope value.',
        };
      }
      return {
        ok: true,
        request: { kind: 'slopeSolveMissing', p1, p2, slopeLatex },
        style,
      };
    }

    const hasExplicitDistanceConstraint = assignments.has('distance');
    const hasExplicitSlopeConstraint = assignments.has('slope');
    const hasExplicitMidConstraint = assignments.has('mid');
    const explicitConstraintCount =
      Number(hasExplicitDistanceConstraint) + Number(hasExplicitSlopeConstraint) + Number(hasExplicitMidConstraint);

    if (
      pointUnknownCount === 1
      && (options.screenHint === 'lineEquation' || explicitConstraintCount > 0)
    ) {
      if (explicitConstraintCount !== 1) {
        return {
          ok: false,
          error: 'lineEquation solve-missing needs exactly one constraint: slope=..., distance=..., or mid=(x,y).',
        };
      }
      if (hasExplicitDistanceConstraint) {
        if (!distanceLatex || isUnknownValue(distanceLatex)) {
          return {
            ok: false,
            error: 'lineEquation solve-missing with distance constraint needs distance=... as a known value.',
          };
        }
        return {
          ok: true,
          request: { kind: 'distanceSolveMissing', p1, p2, distanceLatex },
          style,
        };
      }
      if (hasExplicitMidConstraint) {
        if (!mid || isUnknownValue(mid.xLatex) || isUnknownValue(mid.yLatex)) {
          return {
            ok: false,
            error: 'lineEquation solve-missing with midpoint constraint needs mid=(x,y) with known values.',
          };
        }
        return {
          ok: true,
          request: { kind: 'midpointSolveMissing', p1, p2, mid },
          style,
        };
      }
      if (!slopeLatex || isUnknownValue(slopeLatex)) {
        return {
          ok: false,
          error: 'lineEquation solve-missing with slope constraint needs slope=... as a known value.',
        };
      }
      return {
        ok: true,
        request: { kind: 'slopeSolveMissing', p1, p2, slopeLatex },
        style,
      };
    }

    if (pointUnknownCount === 1) {
      return {
        ok: false,
        error: 'Use a coordinate leaf tool with one ? unknown plus a known relation (distance, midpoint, or slope).',
      };
    }

    if (form) {
      return {
        ok: true,
        request: { kind: 'lineEquation', p1, p2, form },
        style,
      };
    }

    if (options.screenHint === 'midpoint') {
      return { ok: true, request: { kind: 'midpoint', p1, p2 }, style };
    }
    if (options.screenHint === 'slope') {
      return { ok: true, request: { kind: 'slope', p1, p2 }, style };
    }
    if (options.screenHint === 'lineEquation') {
      return {
        ok: true,
        request: { kind: 'lineEquation', p1, p2, form: 'slope-intercept' },
        style,
      };
    }
    if (options.screenHint === 'distance' || hint === 'coordinate') {
      return { ok: true, request: { kind: 'distance', p1, p2 }, style };
    }

    return {
      ok: false,
      error: 'Point shorthand is ambiguous here. Use distance(...), midpoint(...), slope(...), or lineEquation(...).',
    };
  }

  if (radiusLatex && angleValue) {
    const unitMatch = /^(.*?)(deg|rad|grad)$/i.exec(angleValue.replace(/\s+/g, ''));
    const angleLatex = unitMatch ? unitMatch[1] : angleValue;
    const angleUnit = (assignments.get('unit') ?? unitMatch?.[2] ?? 'deg').toLowerCase() as AngleUnit;
    if (!['deg', 'rad', 'grad'].includes(angleUnit)) {
      return {
        ok: false,
        error: 'Use unit=deg, unit=rad, or unit=grad with arc/sector shorthand.',
      };
    }
    return {
      ok: true,
      request: { kind: 'arcSector', radiusLatex, angleLatex, angleUnit },
      style,
    };
  }

  switch (options.screenHint) {
    case 'square':
      if (squareRequest) {
        return { ok: true, request: squareRequest, style };
      }
      break;
    case 'rectangle':
      if (rectangleRequest) {
        return { ok: true, request: rectangleRequest, style };
      }
      break;
    case 'cube':
      if (cubeRequest) {
        return { ok: true, request: cubeRequest, style };
      }
      break;
    case 'cuboid':
      if (cuboidRequest) {
        return { ok: true, request: cuboidRequest, style };
      }
      break;
    case 'cylinder':
      if (cylinderRequest) {
        return { ok: true, request: cylinderRequest, style };
      }
      break;
    case 'cone':
      if (coneRequest) {
        return { ok: true, request: coneRequest, style };
      }
      break;
    case 'sphere':
      if (sphereRequest) {
        return { ok: true, request: sphereRequest, style };
      }
      break;
    case 'triangleArea':
      if (triangleAreaRequest) {
        return { ok: true, request: triangleAreaRequest, style };
      }
      break;
    case 'triangleHeron':
      if (triangleHeronRequest) {
        return { ok: true, request: triangleHeronRequest, style };
      }
      break;
    default:
      break;
  }

  if (
    options.screenHint
    && !(
      options.screenHint === 'home'
      || options.screenHint === 'shapes2dHome'
      || options.screenHint === 'shapes3dHome'
      || options.screenHint === 'triangleHome'
      || options.screenHint === 'circleHome'
      || options.screenHint === 'coordinateHome'
    )
  ) {
    return {
      ok: false,
      error: 'Use the guided fields on this Geometry tool or enter a matching structured Geometry request.',
    };
  }

  if (hint === 'triangle') {
    if (triangleHeronRequest) {
      return { ok: true, request: triangleHeronRequest, style };
    }
    if (triangleAreaRequest) {
      return { ok: true, request: triangleAreaRequest, style };
    }
    return {
      ok: false,
      error: 'Use base/height for Triangle Area or a/b/c for Heron on this Geometry screen.',
    };
  }

  if (hint === 'shape3d') {
    if (cuboidRequest) {
      return { ok: true, request: cuboidRequest, style };
    }
    if (radiusLatex && heightLatex && !slantHeightLatex) {
      return {
        ok: false,
        error: 'r=... and h=... is ambiguous here. It could mean cylinder or cone. Use cylinder(...), cone(...), or open the specific guided tool.',
      };
    }
    if (coneRequest && slantHeightLatex) {
      return { ok: true, request: coneRequest, style };
    }
    if (sphereRequest && !heightLatex && !slantHeightLatex) {
      return { ok: true, request: sphereRequest, style };
    }
    if (cubeRequest) {
      return { ok: true, request: cubeRequest, style };
    }
  }

  if (hint === 'shape2d') {
    if (rectangleRequest) {
      return { ok: true, request: rectangleRequest, style };
    }
    if (squareRequest) {
      return { ok: true, request: squareRequest, style };
    }
  }

  if (hint === 'circle' && sphereRequest) {
    return { ok: true, request: { kind: 'circle', radiusLatex: sphereRequest.radiusLatex }, style };
  }

  if (triangleHeronRequest) {
    return { ok: true, request: triangleHeronRequest, style };
  }

  if (triangleAreaRequest) {
    return { ok: true, request: triangleAreaRequest, style };
  }

  if (cuboidRequest) {
    return { ok: true, request: cuboidRequest, style };
  }

  if (rectangleRequest) {
    return { ok: true, request: rectangleRequest, style };
  }

  if (coneRequest && slantHeightLatex) {
    return { ok: true, request: coneRequest, style };
  }

  if (sideLatex) {
    return {
      ok: false,
      error: 's=... is ambiguous here. Use square(side=...) or cube(side=...) in the Geometry editor.',
    };
  }

  if (radiusLatex && heightLatex) {
    return {
      ok: false,
      error: 'r=... and h=... is ambiguous here. It could mean cylinder or cone. Use cylinder(...), cone(...), or open the specific guided tool.',
    };
  }

  if (radiusLatex) {
    return {
      ok: false,
      error: 'r=... is ambiguous here. Use circle(radius=...) or sphere(radius=...) in the Geometry editor.',
    };
  }

  if (formulaUnknownCount === 1) {
    return {
      ok: false,
      error: 'Use a supported Geometry solve-missing request with exactly one ? unknown on an in-scope Geometry leaf tool.',
    };
  }

  return {
    ok: false,
    error: 'Enter a supported Geometry request or choose a guided Geometry tool.',
  };
}

