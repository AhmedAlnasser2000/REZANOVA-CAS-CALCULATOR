import type {
  CoreDraftStyle,
  GeometryParseResult,
  GeometryRequest,
  GeometryScreen,
} from '../../types/calculator';
import { parseShorthand } from './parser/shorthand';
import {
  normalizeGeometrySource,
  type GeometryParseOptions,
} from './parser/shared';
import { parseStructured } from './parser/structured';

export function geometryRequestToScreen(request: GeometryRequest): GeometryScreen {
  switch (request.kind) {
    case 'square':
      return 'square';
    case 'rectangle':
      return 'rectangle';
    case 'circle':
      return 'circle';
    case 'arcSector':
      return 'arcSector';
    case 'cube':
      return 'cube';
    case 'cuboid':
      return 'cuboid';
    case 'cylinder':
      return 'cylinder';
    case 'cone':
      return 'cone';
    case 'sphere':
      return 'sphere';
    case 'triangleArea':
      return 'triangleArea';
    case 'triangleHeron':
      return 'triangleHeron';
    case 'distance':
      return 'distance';
    case 'midpoint':
      return 'midpoint';
    case 'slope':
      return 'slope';
    case 'lineEquation':
      return 'lineEquation';
    case 'squareSolveMissing':
      return 'square';
    case 'circleSolveMissing':
      return 'circle';
    case 'cubeSolveMissing':
      return 'cube';
    case 'sphereSolveMissing':
      return 'sphere';
    case 'triangleAreaSolveMissing':
      return 'triangleArea';
    case 'rectangleSolveMissing':
      return 'rectangle';
    case 'cylinderSolveMissing':
      return 'cylinder';
    case 'coneSolveMissing':
      return 'cone';
    case 'cuboidSolveMissing':
      return 'cuboid';
    case 'arcSectorSolveMissing':
      return 'arcSector';
    case 'triangleHeronSolveMissing':
      return 'triangleHeron';
    case 'distanceSolveMissing':
      return 'distance';
    case 'midpointSolveMissing':
      return 'midpoint';
    case 'slopeSolveMissing':
      return 'slope';
  }
}

export function parseGeometryDraft(source: string, options: GeometryParseOptions = {}): GeometryParseResult {
  const normalized = normalizeGeometrySource(source);
  if (!normalized) {
    return {
      ok: false,
      error: 'Enter a Geometry request or choose a guided Geometry tool.',
    };
  }

  const structured = parseStructured(normalized);
  if (structured) {
    return structured;
  }

  return parseShorthand(normalized, options);
}

export function geometryDraftStyle(source: string): CoreDraftStyle {
  return /^[A-Za-z][A-Za-z0-9]*\(/.test(normalizeGeometrySource(source)) ? 'structured' : 'shorthand';
}
