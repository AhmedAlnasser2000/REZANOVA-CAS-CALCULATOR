import type { AngleConvertState, AngleUnit, TrigResultOrigin } from '../../types/calculator';
import { formatNumber } from '../format';
import { parseSignedNumberInput } from '../signed-number';

const DEG_PER_RAD = 180 / Math.PI;
const DEG_PER_GRAD = 0.9;
const RAD_PER_DEG = Math.PI / 180;
const EPSILON = 1e-9;

type Ratio = { numerator: number; denominator: number };

export type TrigEvaluation = {
  exactLatex?: string;
  approxText?: string;
  warnings: string[];
  error?: string;
  resultOrigin?: TrigResultOrigin;
};

export type SpecialAngleRow = {
  degrees: number;
  radiansLatex: string;
  sinLatex: string;
  cosLatex: string;
  tanLatex: string;
};

export const SPECIAL_ANGLE_REFERENCE: SpecialAngleRow[] = [
  { degrees: 0, radiansLatex: '0', sinLatex: '0', cosLatex: '1', tanLatex: '0' },
  {
    degrees: 30,
    radiansLatex: '\\frac{\\pi}{6}',
    sinLatex: '\\frac{1}{2}',
    cosLatex: '\\frac{\\sqrt{3}}{2}',
    tanLatex: '\\frac{\\sqrt{3}}{3}',
  },
  {
    degrees: 45,
    radiansLatex: '\\frac{\\pi}{4}',
    sinLatex: '\\frac{\\sqrt{2}}{2}',
    cosLatex: '\\frac{\\sqrt{2}}{2}',
    tanLatex: '1',
  },
  {
    degrees: 60,
    radiansLatex: '\\frac{\\pi}{3}',
    sinLatex: '\\frac{\\sqrt{3}}{2}',
    cosLatex: '\\frac{1}{2}',
    tanLatex: '\\sqrt{3}',
  },
  { degrees: 90, radiansLatex: '\\frac{\\pi}{2}', sinLatex: '1', cosLatex: '0', tanLatex: '\\text{undefined}' },
];

const SPECIAL_RADIANS_BY_DEGREES: Record<number, string> = {
  0: '0',
  15: '\\frac{\\pi}{12}',
  30: '\\frac{\\pi}{6}',
  45: '\\frac{\\pi}{4}',
  60: '\\frac{\\pi}{3}',
  75: '\\frac{5\\pi}{12}',
  90: '\\frac{\\pi}{2}',
  105: '\\frac{7\\pi}{12}',
  120: '\\frac{2\\pi}{3}',
  135: '\\frac{3\\pi}{4}',
  150: '\\frac{5\\pi}{6}',
  165: '\\frac{11\\pi}{12}',
  180: '\\pi',
  195: '\\frac{13\\pi}{12}',
  210: '\\frac{7\\pi}{6}',
  225: '\\frac{5\\pi}{4}',
  240: '\\frac{4\\pi}{3}',
  255: '\\frac{17\\pi}{12}',
  270: '\\frac{3\\pi}{2}',
  285: '\\frac{19\\pi}{12}',
  300: '\\frac{5\\pi}{3}',
  315: '\\frac{7\\pi}{4}',
  330: '\\frac{11\\pi}{6}',
  345: '\\frac{23\\pi}{12}',
  360: '2\\pi',
};

const EXACT_RATIO_VALUES: Array<{ latex: string; value: number }> = [
  { latex: '-1', value: -1 },
  { latex: '-\\frac{\\sqrt{3}}{2}', value: -Math.sqrt(3) / 2 },
  { latex: '-\\frac{\\sqrt{2}}{2}', value: -Math.SQRT1_2 },
  { latex: '-\\frac{1}{2}', value: -0.5 },
  { latex: '-\\frac{\\sqrt{3}}{3}', value: -Math.sqrt(3) / 3 },
  { latex: '-\\sqrt{3}', value: -Math.sqrt(3) },
  { latex: '0', value: 0 },
  { latex: '\\frac{1}{2}', value: 0.5 },
  { latex: '\\frac{\\sqrt{2}}{2}', value: Math.SQRT1_2 },
  { latex: '\\frac{\\sqrt{3}}{2}', value: Math.sqrt(3) / 2 },
  { latex: '\\frac{\\sqrt{3}}{3}', value: Math.sqrt(3) / 3 },
  { latex: '1', value: 1 },
  { latex: '\\sqrt{3}', value: Math.sqrt(3) },
];

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

function normalizeLatex(latex: string) {
  return latex
    .trim()
    .replace(/\s+/g, '')
    .replaceAll('\\left', '')
    .replaceAll('\\right', '')
    .replaceAll('\\cdot', '')
    .replaceAll('\\operatorname{rad}', 'rad')
    .replaceAll('^{\\circ}', 'deg');
}

function approximateFraction(value: number, maxDenominator = 360): Ratio | undefined {
  for (let denominator = 1; denominator <= maxDenominator; denominator += 1) {
    const numerator = Math.round(value * denominator);
    if (Math.abs(value - numerator / denominator) < 1e-9) {
      const divisor = gcd(numerator, denominator);
      return {
        numerator: numerator / divisor,
        denominator: denominator / divisor,
      };
    }
  }

  return undefined;
}

function degreesToExactRadianLatex(degrees: number) {
  const rounded = Math.round(degrees);
  if (Math.abs(degrees - rounded) < EPSILON && SPECIAL_RADIANS_BY_DEGREES[rounded] !== undefined) {
    return SPECIAL_RADIANS_BY_DEGREES[rounded];
  }

  const fraction = approximateFraction(degrees / 180);
  if (!fraction) {
    return undefined;
  }

  const sign = fraction.numerator < 0 ? '-' : '';
  const absoluteNumerator = Math.abs(fraction.numerator);
  if (absoluteNumerator === 0) {
    return '0';
  }
  if (fraction.denominator === 1) {
    return absoluteNumerator === 1 ? `${sign}\\pi` : `${sign}${absoluteNumerator}\\pi`;
  }
  if (absoluteNumerator === 1) {
    return `${sign}\\frac{\\pi}{${fraction.denominator}}`;
  }
  return `${sign}\\frac{${absoluteNumerator}\\pi}{${fraction.denominator}}`;
}

function normalizeDegrees(degrees: number) {
  const normalized = ((degrees % 360) + 360) % 360;
  return Math.abs(normalized - 360) < EPSILON ? 0 : normalized;
}

function referenceAngle(normalizedDegrees: number) {
  if (normalizedDegrees <= 90) {
    return normalizedDegrees;
  }
  if (normalizedDegrees <= 180) {
    return 180 - normalizedDegrees;
  }
  if (normalizedDegrees <= 270) {
    return normalizedDegrees - 180;
  }
  return 360 - normalizedDegrees;
}

function sineSign(normalizedDegrees: number) {
  return normalizedDegrees <= 180 ? 1 : -1;
}

function cosineSign(normalizedDegrees: number) {
  return normalizedDegrees <= 90 || normalizedDegrees >= 270 ? 1 : -1;
}

function ratioLatex(base: string, sign: number) {
  if (base === '0' || sign >= 0) {
    return base;
  }
  return base.startsWith('-') ? base.slice(1) : `-${base}`;
}

export function convertAngle(value: number, from: AngleUnit, to: AngleUnit) {
  if (from === to) {
    return value;
  }

  const degrees =
    from === 'deg' ? value : from === 'rad' ? value * DEG_PER_RAD : value * DEG_PER_GRAD;

  if (to === 'deg') {
    return degrees;
  }
  if (to === 'rad') {
    return degrees * RAD_PER_DEG;
  }
  return degrees / DEG_PER_GRAD;
}

export function parseAngleInput(value: string, unit: AngleUnit) {
  const normalized = normalizeLatex(value);
  if (!normalized) {
    return null;
  }

  if (unit !== 'rad') {
    const cleaned = normalized.replace(/deg$/g, '');
    const parsed = parseSignedNumberInput(cleaned);
    return parsed === null ? null : convertAngle(parsed, unit, 'deg');
  }

  const parsedNumeric = parseSignedNumberInput(normalized);
  if (parsedNumeric !== null) {
    return convertAngle(parsedNumeric, 'rad', 'deg');
  }

  const sign = normalized.startsWith('-') ? -1 : 1;
  const unsigned = sign < 0 ? normalized.slice(1) : normalized;

  if (unsigned === '\\pi') {
    return sign * 180;
  }

  let match = unsigned.match(/^(\d+)\s*\\pi$/);
  if (match) {
    return sign * Number(match[1]) * 180;
  }

  match = unsigned.match(/^\\frac\{\\pi\}\{(\d+)\}$/);
  if (match) {
    return sign * 180 / Number(match[1]);
  }

  match = unsigned.match(/^\\frac\{(\d+)\\pi\}\{(\d+)\}$/);
  if (match) {
    return sign * (Number(match[1]) * 180) / Number(match[2]);
  }

  return null;
}

export function formatAngleLatex(value: number, unit: AngleUnit) {
  if (unit === 'deg') {
    const rounded = Math.round(value);
    const text = Math.abs(value - rounded) < EPSILON ? `${rounded}` : formatNumber(value);
    return `${text}^{\\circ}`;
  }

  if (unit === 'rad') {
    return degreesToExactRadianLatex(convertAngle(value, 'rad', 'deg')) ?? formatNumber(value);
  }

  return formatNumber(value);
}

export function formatDegreesAsUnitLatex(degrees: number, unit: AngleUnit) {
  if (unit === 'deg') {
    const rounded = Math.round(degrees);
    return `${Math.abs(degrees - rounded) < EPSILON ? rounded : formatNumber(degrees)}^{\\circ}`;
  }

  if (unit === 'rad') {
    return degreesToExactRadianLatex(degrees) ?? formatNumber(convertAngle(degrees, 'deg', 'rad'));
  }

  return formatNumber(convertAngle(degrees, 'deg', 'grad'));
}

export function formatDegreesAsUnitText(degrees: number, unit: AngleUnit) {
  if (unit === 'deg') {
    return `${formatNumber(degrees)} deg`;
  }
  if (unit === 'rad') {
    return `${formatNumber(convertAngle(degrees, 'deg', 'rad'))} rad`;
  }
  return `${formatNumber(convertAngle(degrees, 'deg', 'grad'))} grad`;
}

export function parseSupportedRatio(latex: string) {
  const normalized = normalizeLatex(latex);
  for (const entry of EXACT_RATIO_VALUES) {
    if (normalizeLatex(entry.latex) === normalized) {
      return entry.value;
    }
  }

  const fractionMatch = normalized.match(/^\\frac\{([+-]?\d+(?:\.\d+)?)\}\{([+-]?\d+(?:\.\d+)?)\}$/);
  if (fractionMatch) {
    const numerator = Number(fractionMatch[1]);
    const denominator = Number(fractionMatch[2]);
    if (Number.isFinite(numerator) && Number.isFinite(denominator) && Math.abs(denominator) > EPSILON) {
      return numerator / denominator;
    }
  }

  const numeric = parseSignedNumberInput(normalized);
  return numeric;
}

export function exactRatioLatex(value: number) {
  return EXACT_RATIO_VALUES.find((entry) => Math.abs(entry.value - value) < EPSILON)?.latex;
}

export function evaluateSpecialTrig(kind: 'sin' | 'cos' | 'tan', degrees: number) {
  const normalized = normalizeDegrees(degrees);
  const reference = referenceAngle(normalized);

  if (![0, 30, 45, 60, 90].some((value) => Math.abs(reference - value) < EPSILON)) {
    return undefined;
  }

  if (kind === 'sin') {
    const base =
      Math.abs(reference - 0) < EPSILON
        ? '0'
        : Math.abs(reference - 30) < EPSILON
          ? '\\frac{1}{2}'
          : Math.abs(reference - 45) < EPSILON
            ? '\\frac{\\sqrt{2}}{2}'
            : Math.abs(reference - 60) < EPSILON
              ? '\\frac{\\sqrt{3}}{2}'
              : '1';
    return ratioLatex(base, sineSign(normalized));
  }

  if (kind === 'cos') {
    const base =
      Math.abs(reference - 0) < EPSILON
        ? '1'
        : Math.abs(reference - 30) < EPSILON
          ? '\\frac{\\sqrt{3}}{2}'
          : Math.abs(reference - 45) < EPSILON
            ? '\\frac{\\sqrt{2}}{2}'
            : Math.abs(reference - 60) < EPSILON
              ? '\\frac{1}{2}'
              : '0';
    return ratioLatex(base, cosineSign(normalized));
  }

  if (Math.abs(reference - 90) < EPSILON) {
    return '\\text{undefined}';
  }

  const base =
    Math.abs(reference - 0) < EPSILON
      ? '0'
      : Math.abs(reference - 30) < EPSILON
        ? '\\frac{\\sqrt{3}}{3}'
        : Math.abs(reference - 45) < EPSILON
          ? '1'
          : '\\sqrt{3}';
  return ratioLatex(base, sineSign(normalized) * cosineSign(normalized));
}

export function convertAngleState(state: AngleConvertState): TrigEvaluation {
  const parsed = parseSignedNumberInput(state.value);
  if (parsed === null) {
    return {
      error: 'Enter a numeric angle value before converting.',
      warnings: [],
    };
  }

  const converted = convertAngle(parsed, state.from, state.to);
  const degrees = convertAngle(parsed, state.from, 'deg');
  const exactLatex =
    state.to === 'rad'
      ? formatDegreesAsUnitLatex(degrees, 'rad')
      : state.to === 'deg'
        ? formatDegreesAsUnitLatex(degrees, 'deg')
        : formatDegreesAsUnitLatex(degrees, 'grad');

  return {
    exactLatex,
    approxText: formatNumber(converted),
    warnings: [`Converted from ${state.from.toUpperCase()} to ${state.to.toUpperCase()}.`],
    resultOrigin: state.to === 'rad' && degreesToExactRadianLatex(degrees) ? 'exact-special-angle' : 'numeric',
  };
}
