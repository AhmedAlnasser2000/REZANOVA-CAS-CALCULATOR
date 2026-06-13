import type {
  GeometryParseResult,
  GeometryRequest,
  GeometryScreen,
  LineEquationState,
} from '../../../types/calculator';

export type GeometryParseOptions = {
  screenHint?: GeometryScreen;
};

export function normalizeGeometrySource(source: string) {
  return source
    .trim()
    .replaceAll('\\left', '')
    .replaceAll('\\right', '')
    .replace(/\\operatorname\{([^}]+)\}/g, '$1')
    .replace(/\\mathrm\{([^}]+)\}/g, '$1')
    .replace(/\\text\{([^}]+)\}/g, '$1')
    .replaceAll('P_1', 'P1')
    .replaceAll('P_2', 'P2')
    .replaceAll('\\ ', ' ')
    .replace(/\s+/g, ' ');
}

function splitTopLevel(source: string, delimiter = ',') {
  const segments: string[] = [];
  let current = '';
  let depth = 0;
  for (const char of source) {
    if (char === '(' || char === '{' || char === '[') {
      depth += 1;
    } else if (char === ')' || char === '}' || char === ']') {
      depth = Math.max(depth - 1, 0);
    }

    if (char === delimiter && depth === 0) {
      segments.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  if (current.trim()) {
    segments.push(current.trim());
  }

  return segments;
}

function splitAssignment(source: string) {
  let depth = 0;
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (char === '(' || char === '{' || char === '[') {
      depth += 1;
    } else if (char === ')' || char === '}' || char === ']') {
      depth = Math.max(depth - 1, 0);
    } else if (char === '=' && depth === 0) {
      return {
        key: source.slice(0, index).trim(),
        value: source.slice(index + 1).trim(),
      };
    }
  }

  return null;
}

function stripOuterParens(source: string) {
  const trimmed = source.trim();
  if (trimmed.startsWith('(') && trimmed.endsWith(')')) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

export function parsePoint(source: string) {
  const body = stripOuterParens(source);
  const parts = splitTopLevel(body);
  if (parts.length !== 2) {
    return null;
  }

  return {
    xLatex: parts[0].trim(),
    yLatex: parts[1].trim(),
  };
}

export function parseAssignments(source: string) {
  const entries = splitTopLevel(source);
  const assignments = new Map<string, string>();
  for (const entry of entries) {
    const assignment = splitAssignment(entry);
    if (!assignment) {
      return null;
    }
    assignments.set(assignment.key.toLowerCase().replaceAll(' ', ''), assignment.value);
  }

  return assignments;
}

export function isUnknownValue(value?: string): value is string {
  return value?.trim() === '?';
}

export function countUnknownValues(values: Array<string | undefined>) {
  return values.reduce((count, value) => (isUnknownValue(value) ? count + 1 : count), 0);
}

export function parseLineForm(value?: string): LineEquationState['form'] | null {
  if (!value) {
    return null;
  }

  const normalized = value
    .toLowerCase()
    .replaceAll(' ', '')
    .replaceAll('_', '-');

  if (normalized === 'slope-intercept' || normalized === 'slopeintercept') {
    return 'slope-intercept';
  }
  if (normalized === 'point-slope' || normalized === 'pointslope') {
    return 'point-slope';
  }
  if (normalized === 'standard') {
    return 'standard';
  }

  return null;
}

type LineConstraintInput = {
  slopeLatex?: string;
  distanceLatex?: string;
  midpointLatex?: string;
};

export function parseLineConstraint(
  input: LineConstraintInput,
  pointUnknownCount: number,
): GeometryParseResult | null {
  if (pointUnknownCount > 1) {
    return { ok: false, error: 'Use exactly one ? unknown in lineEquation(...) coordinate constraints.' };
  }

  const constraintKinds = [
    input.slopeLatex ? 'slope' : null,
    input.distanceLatex ? 'distance' : null,
    input.midpointLatex ? 'midpoint' : null,
  ].filter((value): value is 'slope' | 'distance' | 'midpoint' => value !== null);

  if (constraintKinds.length === 0) {
    return null;
  }
  if (constraintKinds.length > 1) {
    return { ok: false, error: 'lineEquation solve-missing supports exactly one constraint: slope=..., distance=..., or mid=(x,y).' };
  }
  if (pointUnknownCount !== 1) {
    return { ok: false, error: 'lineEquation solve-missing needs exactly one ? coordinate plus one known constraint.' };
  }
  return null;
}

export function kindFromFunctionName(name: string): GeometryRequest['kind'] | null {
  switch (name.toLowerCase().replaceAll(' ', '')) {
    case 'square':
      return 'square';
    case 'rectangle':
      return 'rectangle';
    case 'circle':
      return 'circle';
    case 'arcsector':
    case 'sector':
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
    case 'trianglearea':
      return 'triangleArea';
    case 'triangleheron':
      return 'triangleHeron';
    case 'distance':
      return 'distance';
    case 'midpoint':
      return 'midpoint';
    case 'slope':
      return 'slope';
    case 'lineequation':
    case 'line':
      return 'lineEquation';
    default:
      return null;
  }
}

export function familyHint(screenHint?: GeometryScreen) {
  if (!screenHint) {
    return 'none' as const;
  }

  if (screenHint === 'square' || screenHint === 'rectangle' || screenHint === 'shapes2dHome') {
    return 'shape2d' as const;
  }
  if (
    screenHint === 'cube'
    || screenHint === 'cuboid'
    || screenHint === 'cylinder'
    || screenHint === 'cone'
    || screenHint === 'sphere'
    || screenHint === 'shapes3dHome'
  ) {
    return 'shape3d' as const;
  }
  if (
    screenHint === 'triangleArea'
    || screenHint === 'triangleHeron'
    || screenHint === 'triangleHome'
  ) {
    return 'triangle' as const;
  }
  if (screenHint === 'circle' || screenHint === 'arcSector' || screenHint === 'circleHome') {
    return 'circle' as const;
  }
  if (
    screenHint === 'distance'
    || screenHint === 'midpoint'
    || screenHint === 'slope'
    || screenHint === 'lineEquation'
    || screenHint === 'coordinateHome'
  ) {
    return 'coordinate' as const;
  }

  return 'none' as const;
}
