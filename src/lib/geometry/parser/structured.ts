import type {
  AngleUnit,
  GeometryParseResult,
} from '../../../types/calculator';
import {
  countUnknownValues,
  isUnknownValue,
  kindFromFunctionName,
  parseAssignments,
  parseLineConstraint,
  parseLineForm,
  parsePoint,
} from './shared';

export function parseStructured(source: string): GeometryParseResult | null {
  const match = /^([A-Za-z][A-Za-z0-9]*)\((.*)\)$/.exec(source);
  if (!match) {
    return null;
  }

  const [, functionName, argumentSource] = match;
  const kind = kindFromFunctionName(functionName);
  if (kind === null) {
    return {
      ok: false,
      error: 'Use a supported Geometry request such as square(...), cube(...), triangleArea(...), distance(...), or lineEquation(...).',
    };
  }

  const assignments = parseAssignments(argumentSource);
  if (!assignments) {
    return {
      ok: false,
      error: 'Geometry requests use comma-separated key=value arguments.',
    };
  }

  const hasWidthKey = assignments.has('width') || assignments.has('w');
  const rawL = assignments.get('l');
  const lengthLatex = assignments.get('length') ?? (hasWidthKey ? rawL : undefined);
  const slantHeightLatex =
    assignments.get('slantheight')
    ?? assignments.get('slant')
    ?? (assignments.get('radius') || assignments.get('r') ? rawL : undefined);
  const explicitBaseLatex = assignments.get('base');
  const areaLatex = assignments.get('area');
  const perimeterLatex = assignments.get('perimeter') ?? assignments.get('p');
  const diagonalLatex = assignments.get('diagonal') ?? assignments.get('d');
  const diameterLatex = assignments.get('diameter') ?? assignments.get('d');
  const circumferenceLatex = assignments.get('circumference') ?? assignments.get('c');
  const arcLatex = assignments.get('arc');
  const sectorLatex = assignments.get('sector');
  const volumeLatex = assignments.get('volume') ?? assignments.get('v');
  const surfaceAreaLatex = assignments.get('surfacearea') ?? assignments.get('sa') ?? assignments.get('surface');
  const aLatex = assignments.get('a');
  const cLatex = assignments.get('c');
  const baseLatex = explicitBaseLatex ?? (!aLatex && !cLatex ? assignments.get('b') : undefined);
  const distanceLatex = assignments.get('distance') ?? assignments.get('d');
  const midpointLatex = assignments.get('mid');
  const slopeLatex = assignments.get('slope');

  const pointPair = () => {
    const p1 = parsePoint(assignments.get('p1') ?? '');
    const p2 = parsePoint(assignments.get('p2') ?? '');
    const form = parseLineForm(assignments.get('form'));
    if (!p1 || !p2) {
      return null;
    }
    return { p1, p2, form };
  };

  switch (kind) {
    case 'square': {
      const sideLatex = assignments.get('side') ?? assignments.get('s');
      const unknownCount = countUnknownValues([
        sideLatex,
        areaLatex,
        perimeterLatex,
        diagonalLatex,
      ]);
      if (unknownCount > 1) {
        return { ok: false, error: 'Use exactly one ? unknown in square(...).' };
      }
      if (unknownCount === 1 && !isUnknownValue(sideLatex)) {
        return { ok: false, error: 'square(...) solve-missing supports ? on side only.' };
      }
      if (isUnknownValue(sideLatex)) {
        const knownEntries = [
          ['area', areaLatex],
          ['perimeter', perimeterLatex],
          ['diagonal', diagonalLatex],
        ].filter((entry): entry is [string, string] => Boolean(entry[1]) && !isUnknownValue(entry[1]));
        if (knownEntries.length !== 1) {
          return { ok: false, error: 'square(side=?, ...) needs exactly one known relation: area, perimeter, or diagonal.' };
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
          style: 'structured',
        };
      }
      return sideLatex
        ? { ok: true, request: { kind, sideLatex }, style: 'structured' }
        : { ok: false, error: 'square(...) needs side=...' };
    }
    case 'rectangle': {
      const widthLatex = assignments.get('width') ?? assignments.get('w');
      const heightLatex = assignments.get('height') ?? assignments.get('h');
      const unknownCount = countUnknownValues([
        widthLatex,
        heightLatex,
        areaLatex,
        perimeterLatex,
        diagonalLatex,
      ]);
      if (unknownCount > 1) {
        return { ok: false, error: 'Use exactly one ? unknown in rectangle(...).' };
      }
      if (unknownCount === 1) {
        if (!isUnknownValue(widthLatex) && !isUnknownValue(heightLatex)) {
          return { ok: false, error: 'rectangle(...) solve-missing supports ? on width or height only.' };
        }
        const unknown = isUnknownValue(widthLatex) ? 'width' : 'height';
        const knownSideLatex = unknown === 'width' ? heightLatex : widthLatex;
        if (!knownSideLatex || isUnknownValue(knownSideLatex)) {
          return { ok: false, error: 'rectangle(...) solve-missing needs the other side as a known value.' };
        }
        const knownEntries = [
          ['area', areaLatex],
          ['perimeter', perimeterLatex],
          ['diagonal', diagonalLatex],
        ].filter((entry): entry is [string, string] => Boolean(entry[1]) && !isUnknownValue(entry[1]));
        if (knownEntries.length !== 1) {
          return { ok: false, error: 'rectangle(..., ? , ...) needs exactly one known relation: area, perimeter, or diagonal.' };
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
          style: 'structured',
        };
      }
      return widthLatex && heightLatex
        ? { ok: true, request: { kind, widthLatex, heightLatex }, style: 'structured' }
        : { ok: false, error: 'rectangle(...) needs width=... and height=...' };
    }
    case 'circle': {
      const radiusLatex = assignments.get('radius') ?? assignments.get('r');
      const unknownCount = countUnknownValues([
        radiusLatex,
        diameterLatex,
        circumferenceLatex,
        areaLatex,
      ]);
      if (unknownCount > 1) {
        return { ok: false, error: 'Use exactly one ? unknown in circle(...).' };
      }
      if (unknownCount === 1 && !isUnknownValue(radiusLatex)) {
        return { ok: false, error: 'circle(...) solve-missing supports ? on radius only.' };
      }
      if (isUnknownValue(radiusLatex)) {
        const knownEntries = [
          ['diameter', diameterLatex],
          ['circumference', circumferenceLatex],
          ['area', areaLatex],
        ].filter((entry): entry is [string, string] => Boolean(entry[1]) && !isUnknownValue(entry[1]));
        if (knownEntries.length !== 1) {
          return { ok: false, error: 'circle(radius=?, ...) needs exactly one known relation: diameter, circumference, or area.' };
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
          style: 'structured',
        };
      }
      return radiusLatex
        ? { ok: true, request: { kind, radiusLatex }, style: 'structured' }
        : { ok: false, error: 'circle(...) needs radius=...' };
    }
    case 'arcSector': {
      const radiusLatex = assignments.get('radius') ?? assignments.get('r');
      const angleLatex = assignments.get('angle') ?? assignments.get('theta');
      const angleUnit = (assignments.get('unit') ?? assignments.get('angleunit') ?? 'deg') as AngleUnit;
      if (!radiusLatex || !angleLatex || !['deg', 'rad', 'grad'].includes(angleUnit)) {
        return { ok: false, error: 'arcSector(...) needs radius=..., angle=..., and unit=deg|rad|grad.' };
      }
      const unknownCount = countUnknownValues([
        radiusLatex,
        angleLatex,
        arcLatex,
        sectorLatex,
      ]);
      if (unknownCount > 1) {
        return { ok: false, error: 'Use exactly one ? unknown in arcSector(...).' };
      }
      if (unknownCount === 1) {
        const unknown = isUnknownValue(radiusLatex)
          ? 'radius'
          : isUnknownValue(angleLatex)
            ? 'angle'
            : null;
        if (!unknown) {
          return { ok: false, error: 'arcSector(...) solve-missing supports ? on radius or angle only.' };
        }
        const knownEntries = [
          ['arc', arcLatex],
          ['sector', sectorLatex],
        ].filter((entry): entry is [string, string] => Boolean(entry[1]) && !isUnknownValue(entry[1]));
        if (knownEntries.length !== 1) {
          return { ok: false, error: 'arcSector(..., ? , ...) needs exactly one known relation: arc or sector.' };
        }
        return {
          ok: true,
          request: {
            kind: 'arcSectorSolveMissing',
            radiusLatex,
            angleLatex,
            angleUnit,
            unknown,
            ...(knownEntries[0][0] === 'arc' ? { arcLatex: knownEntries[0][1] } : {}),
            ...(knownEntries[0][0] === 'sector' ? { sectorLatex: knownEntries[0][1] } : {}),
          },
          style: 'structured',
        };
      }
      return { ok: true, request: { kind, radiusLatex, angleLatex, angleUnit }, style: 'structured' };
    }
    case 'cube': {
      const sideLatex = assignments.get('side') ?? assignments.get('s');
      const unknownCount = countUnknownValues([
        sideLatex,
        volumeLatex,
        surfaceAreaLatex,
        diagonalLatex,
      ]);
      if (unknownCount > 1) {
        return { ok: false, error: 'Use exactly one ? unknown in cube(...).' };
      }
      if (unknownCount === 1 && !isUnknownValue(sideLatex)) {
        return { ok: false, error: 'cube(...) solve-missing supports ? on side only.' };
      }
      if (isUnknownValue(sideLatex)) {
        const knownEntries = [
          ['volume', volumeLatex],
          ['surfaceArea', surfaceAreaLatex],
          ['diagonal', diagonalLatex],
        ].filter((entry): entry is [string, string] => Boolean(entry[1]) && !isUnknownValue(entry[1]));
        if (knownEntries.length !== 1) {
          return { ok: false, error: 'cube(side=?, ...) needs exactly one known relation: volume, surfaceArea, or diagonal.' };
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
          style: 'structured',
        };
      }
      return sideLatex
        ? { ok: true, request: { kind, sideLatex }, style: 'structured' }
        : { ok: false, error: 'cube(...) needs side=...' };
    }
    case 'cuboid': {
      const widthLatex = assignments.get('width') ?? assignments.get('w');
      const heightLatex = assignments.get('height') ?? assignments.get('h');
      const unknownCount = countUnknownValues([
        lengthLatex,
        widthLatex,
        heightLatex,
        volumeLatex,
        diagonalLatex,
      ]);
      if (unknownCount > 1) {
        return { ok: false, error: 'Use exactly one ? unknown in cuboid(...).' };
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
          return { ok: false, error: 'cuboid(...) solve-missing supports ? on length, width, or height only.' };
        }
        const knownDimensions = [
          ['length', lengthLatex],
          ['width', widthLatex],
          ['height', heightLatex],
        ]
          .filter((entry) => entry[0] !== unknown)
          .every((entry) => Boolean(entry[1]) && !isUnknownValue(entry[1]));
        if (!knownDimensions) {
          return { ok: false, error: 'cuboid(...) solve-missing needs the other two dimensions as known values.' };
        }
        const knownEntries = [
          ['volume', volumeLatex],
          ['diagonal', diagonalLatex],
        ].filter((entry): entry is [string, string] => Boolean(entry[1]) && !isUnknownValue(entry[1]));
        if (knownEntries.length !== 1) {
          return { ok: false, error: 'cuboid(..., ? , ...) needs exactly one known relation: volume or diagonal.' };
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
          style: 'structured',
        };
      }
      return lengthLatex && widthLatex && heightLatex
        ? { ok: true, request: { kind, lengthLatex, widthLatex, heightLatex }, style: 'structured' }
        : { ok: false, error: 'cuboid(...) needs length=..., width=..., and height=...' };
    }
    case 'cylinder': {
      const radiusLatex = assignments.get('radius') ?? assignments.get('r');
      const heightLatex = assignments.get('height') ?? assignments.get('h');
      const unknownCount = countUnknownValues([
        radiusLatex,
        heightLatex,
        volumeLatex,
      ]);
      if (unknownCount > 1) {
        return { ok: false, error: 'Use exactly one ? unknown in cylinder(...).' };
      }
      if (unknownCount === 1) {
        const unknown = isUnknownValue(radiusLatex)
          ? 'radius'
          : isUnknownValue(heightLatex)
            ? 'height'
            : null;
        if (!unknown) {
          return { ok: false, error: 'cylinder(...) solve-missing supports ? on radius or height only.' };
        }
        if (!volumeLatex || isUnknownValue(volumeLatex)) {
          return { ok: false, error: 'cylinder(..., ? , ...) needs a known volume value.' };
        }
        const knownOther = unknown === 'radius' ? heightLatex : radiusLatex;
        if (!knownOther || isUnknownValue(knownOther)) {
          return { ok: false, error: 'cylinder(...) solve-missing needs the other dimension as a known value.' };
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
          style: 'structured',
        };
      }
      return radiusLatex && heightLatex
        ? { ok: true, request: { kind, radiusLatex, heightLatex }, style: 'structured' }
        : { ok: false, error: 'cylinder(...) needs radius=... and height=...' };
    }
    case 'cone': {
      const radiusLatex = assignments.get('radius') ?? assignments.get('r');
      const heightLatex = assignments.get('height') ?? assignments.get('h');
      if (!radiusLatex || (!heightLatex && !slantHeightLatex && !volumeLatex)) {
        return { ok: false, error: 'cone(...) needs radius=... plus height=... or slantHeight=...' };
      }
      const unknownCount = countUnknownValues([
        radiusLatex,
        heightLatex,
        slantHeightLatex,
        volumeLatex,
      ]);
      if (unknownCount > 1) {
        return { ok: false, error: 'Use exactly one ? unknown in cone(...).' };
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
          return { ok: false, error: 'cone(...) solve-missing supports ? on radius, height, or slantHeight only.' };
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
        } else {
          if (!radiusLatex || isUnknownValue(radiusLatex) || !heightLatex || isUnknownValue(heightLatex)) {
            return { ok: false, error: 'cone(slantHeight=?, ...) needs known radius and height.' };
          }
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
          style: 'structured',
        };
      }
      return {
        ok: true,
        request: {
          kind,
          radiusLatex,
          ...(heightLatex ? { heightLatex } : {}),
          ...(slantHeightLatex ? { slantHeightLatex } : {}),
        },
        style: 'structured',
      };
    }
    case 'sphere': {
      const radiusLatex = assignments.get('radius') ?? assignments.get('r');
      const unknownCount = countUnknownValues([
        radiusLatex,
        volumeLatex,
        surfaceAreaLatex,
      ]);
      if (unknownCount > 1) {
        return { ok: false, error: 'Use exactly one ? unknown in sphere(...).' };
      }
      if (unknownCount === 1 && !isUnknownValue(radiusLatex)) {
        return { ok: false, error: 'sphere(...) solve-missing supports ? on radius only.' };
      }
      if (isUnknownValue(radiusLatex)) {
        const knownEntries = [
          ['volume', volumeLatex],
          ['surfaceArea', surfaceAreaLatex],
        ].filter((entry): entry is [string, string] => Boolean(entry[1]) && !isUnknownValue(entry[1]));
        if (knownEntries.length !== 1) {
          return { ok: false, error: 'sphere(radius=?, ...) needs exactly one known relation: volume or surfaceArea.' };
        }
        return {
          ok: true,
          request: {
            kind: 'sphereSolveMissing',
            radiusLatex,
            ...(knownEntries[0][0] === 'volume' ? { volumeLatex: knownEntries[0][1] } : {}),
            ...(knownEntries[0][0] === 'surfaceArea' ? { surfaceAreaLatex: knownEntries[0][1] } : {}),
          },
          style: 'structured',
        };
      }
      return radiusLatex
        ? { ok: true, request: { kind, radiusLatex }, style: 'structured' }
        : { ok: false, error: 'sphere(...) needs radius=...' };
    }
    case 'triangleArea': {
      const heightLatex = assignments.get('height') ?? assignments.get('h');
      const unknownCount = countUnknownValues([
        baseLatex,
        heightLatex,
        areaLatex,
      ]);
      if (unknownCount > 1) {
        return { ok: false, error: 'Use exactly one ? unknown in triangleArea(...).' };
      }
      if (unknownCount === 1) {
        const unknown = isUnknownValue(baseLatex)
          ? 'base'
          : isUnknownValue(heightLatex)
            ? 'height'
            : null;
        if (!unknown) {
          return { ok: false, error: 'triangleArea(...) solve-missing supports ? on base or height only.' };
        }
        if (!areaLatex || isUnknownValue(areaLatex)) {
          return { ok: false, error: 'triangleArea(..., ? , ...) needs a known area value.' };
        }
        const knownOther = unknown === 'base' ? heightLatex : baseLatex;
        if (!knownOther || isUnknownValue(knownOther)) {
          return { ok: false, error: 'triangleArea(...) solve-missing needs the other dimension as a known value.' };
        }
        return {
          ok: true,
          request: {
            kind: 'triangleAreaSolveMissing',
            baseLatex: baseLatex ?? '?',
            heightLatex: heightLatex ?? '?',
            areaLatex,
            unknown,
          },
          style: 'structured',
        };
      }
      return baseLatex && heightLatex
        ? { ok: true, request: { kind, baseLatex, heightLatex }, style: 'structured' }
        : { ok: false, error: 'triangleArea(...) needs base=... and height=...' };
    }
    case 'triangleHeron': {
      const bLatex = assignments.get('b');
      const unknownCount = countUnknownValues([
        aLatex,
        bLatex,
        cLatex,
        areaLatex,
      ]);
      if (unknownCount > 1) {
        return { ok: false, error: 'Use exactly one ? unknown in triangleHeron(...).' };
      }
      if (unknownCount === 1) {
        const unknown = isUnknownValue(aLatex)
          ? 'a'
          : isUnknownValue(bLatex)
            ? 'b'
            : isUnknownValue(cLatex)
              ? 'c'
              : null;
        if (!unknown) {
          return { ok: false, error: 'triangleHeron(...) solve-missing supports ? on side a, b, or c only.' };
        }
        if (!areaLatex || isUnknownValue(areaLatex)) {
          return { ok: false, error: 'triangleHeron(..., ? , ...) needs a known area value.' };
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
          style: 'structured',
        };
      }
      return aLatex && bLatex && cLatex
        ? { ok: true, request: { kind, aLatex, bLatex, cLatex }, style: 'structured' }
        : { ok: false, error: 'triangleHeron(...) needs a=..., b=..., and c=...' };
    }
    case 'distance':
    case 'midpoint':
    case 'slope': {
      const midpointConstraintLatex = midpointLatex ?? assignments.get('m');
      const slopeConstraintLatex = slopeLatex ?? assignments.get('m');
      const pair = pointPair();
      if (!pair) {
        return { ok: false, error: `${kind}(...) needs p1=(x,y) and p2=(x,y).` };
      }

      const pointUnknownCount = countUnknownValues([
        pair.p1.xLatex,
        pair.p1.yLatex,
        pair.p2.xLatex,
        pair.p2.yLatex,
      ]);
      if (pointUnknownCount > 1) {
        return { ok: false, error: `Use exactly one ? unknown in ${kind}(...).` };
      }
      if (pointUnknownCount === 1) {
        if (kind === 'distance') {
          if (!distanceLatex || isUnknownValue(distanceLatex)) {
            return { ok: false, error: 'distance(..., ? , ...) needs a known distance value.' };
          }
          return {
            ok: true,
            request: { kind: 'distanceSolveMissing', p1: pair.p1, p2: pair.p2, distanceLatex },
            style: 'structured',
          };
        }
        if (kind === 'midpoint') {
          const mid = parsePoint(midpointConstraintLatex ?? '');
          if (!mid) {
            return { ok: false, error: 'midpoint(..., ? , ...) needs mid=(x,y).' };
          }
          const midUnknownCount = countUnknownValues([mid.xLatex, mid.yLatex]);
          if (midUnknownCount > 0) {
            return { ok: false, error: 'midpoint solve-missing needs mid=(x,y) with known numeric components.' };
          }
          return {
            ok: true,
            request: { kind: 'midpointSolveMissing', p1: pair.p1, p2: pair.p2, mid },
            style: 'structured',
          };
        }
        if (!slopeConstraintLatex || isUnknownValue(slopeConstraintLatex)) {
          return { ok: false, error: 'slope(..., ? , ...) needs a known slope value.' };
        }
        return {
          ok: true,
          request: { kind: 'slopeSolveMissing', p1: pair.p1, p2: pair.p2, slopeLatex: slopeConstraintLatex },
          style: 'structured',
        };
      }

      return { ok: true, request: { kind, p1: pair.p1, p2: pair.p2 }, style: 'structured' };
    }
    case 'lineEquation': {
      const pair = pointPair();
      const form = pair?.form ?? parseLineForm(assignments.get('form')) ?? 'slope-intercept';
      if (!pair) {
        return { ok: false, error: 'lineEquation(...) needs p1=(x,y), p2=(x,y), and an optional form=...' };
      }
      const pointUnknownCount = countUnknownValues([
        pair.p1.xLatex,
        pair.p1.yLatex,
        pair.p2.xLatex,
        pair.p2.yLatex,
      ]);
      const lineConstraint = parseLineConstraint(
        {
          slopeLatex: assignments.get('slope'),
          distanceLatex: assignments.get('distance'),
          midpointLatex: assignments.get('mid'),
        },
        pointUnknownCount,
      );
      if (lineConstraint) {
        return lineConstraint;
      }
      if (pointUnknownCount === 1) {
        if (assignments.has('distance')) {
          const knownDistance = assignments.get('distance');
          if (!knownDistance || isUnknownValue(knownDistance)) {
            return { ok: false, error: 'lineEquation solve-missing with distance constraint needs distance=... as a known value.' };
          }
          return {
            ok: true,
            request: { kind: 'distanceSolveMissing', p1: pair.p1, p2: pair.p2, distanceLatex: knownDistance },
            style: 'structured',
          };
        }
        if (assignments.has('mid')) {
          const mid = parsePoint(assignments.get('mid') ?? '');
          if (!mid || isUnknownValue(mid.xLatex) || isUnknownValue(mid.yLatex)) {
            return { ok: false, error: 'lineEquation solve-missing with midpoint constraint needs mid=(x,y) with known values.' };
          }
          return {
            ok: true,
            request: { kind: 'midpointSolveMissing', p1: pair.p1, p2: pair.p2, mid },
            style: 'structured',
          };
        }
        if (!assignments.has('slope')) {
          return { ok: false, error: 'lineEquation solve-missing needs exactly one constraint: slope=..., distance=..., or mid=(x,y).' };
        }
        const knownSlope = assignments.get('slope');
        if (!knownSlope || isUnknownValue(knownSlope)) {
          return { ok: false, error: 'lineEquation solve-missing with slope constraint needs slope=... as a known value.' };
        }
        return {
          ok: true,
          request: { kind: 'slopeSolveMissing', p1: pair.p1, p2: pair.p2, slopeLatex: knownSlope },
          style: 'structured',
        };
      }
      return { ok: true, request: { kind, p1: pair.p1, p2: pair.p2, form }, style: 'structured' };
    }
  }

  return {
    ok: false,
    error: 'Use a supported Geometry request such as square(...), cube(...), triangleArea(...), distance(...), or lineEquation(...).',
  };
}

