import type { AngleUnit } from '../../types/calculator';
import { formatNumber } from '../display/format';
import { mathDetailSection } from '../display/result-detail-lines';
import {
  degreesToUnitMathJson,
  formatDegreesAsUnitLatex,
  type TrigEvaluation,
} from './angles';
import { profileTrigonometryResult } from '../display/printer';

type TrigCarrier = 'sin' | 'cos' | 'tan';

type ParsedScalar = {
  value: number;
  latex: string;
};

type ParsedPeriodPhase = {
  carrier: TrigCarrier;
  amplitude: ParsedScalar;
  coefficient: ParsedScalar;
  offsetLatex: string;
  offsetPiCoefficient: number | null;
  verticalShift: ParsedScalar;
  argumentLatex: string;
};

const PERIOD_PHASE_ERROR =
  'Period & Phase supports expression-only affine sin, cos, and tan forms such as 2sin(3x-pi)+1. Use Equation for trig equations.';

function normalizeLatex(source: string) {
  return source
    .trim()
    .replaceAll('\\left', '')
    .replaceAll('\\right', '')
    .replace(/\\operatorname\{([^}]+)\}/g, '\\$1')
    .replace(/\\mathrm\{([^}]+)\}/g, '$1')
    .replace(/\s+/g, '')
    .replace(/(^|[^\\A-Za-z])pi\b/g, '$1\\pi')
    .replaceAll('\\cdot', '*');
}

function parseScalar(source: string, fallbackValue?: number): ParsedScalar | null {
  let token = source.trim().replaceAll('*', '');
  if (!token && fallbackValue !== undefined) {
    return { value: fallbackValue, latex: fallbackValue === 1 ? '1' : '-1' };
  }
  if (token === '+' && fallbackValue !== undefined) {
    return { value: fallbackValue, latex: fallbackValue === 1 ? '1' : '-1' };
  }
  if (token === '-' && fallbackValue !== undefined) {
    return { value: -fallbackValue, latex: fallbackValue === 1 ? '-1' : '1' };
  }

  token = token.replace(/^\+/, '');
  const numeric = Number(token);
  if (Number.isFinite(numeric)) {
    return { value: numeric, latex: formatNumber(numeric) };
  }

  const fraction = /^(-?)\\frac\{(-?\d+(?:\.\d+)?)\}\{(\d+(?:\.\d+)?)\}$/.exec(token);
  if (fraction) {
    const sign = fraction[1] === '-' ? -1 : 1;
    const numerator = Number(fraction[2]);
    const denominator = Number(fraction[3]);
    if (Number.isFinite(numerator) && Number.isFinite(denominator) && denominator !== 0) {
      const value = sign * numerator / denominator;
      const latex = value < 0
        ? `-\\frac{${Math.abs(numerator)}}{${denominator}}`
        : `\\frac{${numerator}}{${denominator}}`;
      return { value, latex };
    }
  }

  return null;
}

function parseSignedShift(source: string): ParsedScalar | null {
  if (!source) {
    return { value: 0, latex: '0' };
  }
  if (!/^[+-]/.test(source)) {
    return null;
  }
  return parseScalar(source);
}

function findMatchingParen(source: string, openIndex: number) {
  let depth = 0;
  for (let index = openIndex; index < source.length; index += 1) {
    const char = source[index];
    if (char === '(') {
      depth += 1;
    } else if (char === ')') {
      depth -= 1;
      if (depth === 0) {
        return index;
      }
    }
  }
  return -1;
}

function parsePiCoefficient(source: string): number | null {
  if (!source) {
    return 0;
  }
  const sign = source.startsWith('-') ? -1 : 1;
  const unsigned = source.replace(/^[+-]/, '');
  if (unsigned === '\\pi') {
    return sign;
  }
  let match = /^(\d+(?:\.\d+)?)\\pi$/.exec(unsigned);
  if (match) {
    return sign * Number(match[1]);
  }
  match = /^\\frac\{\\pi\}\{(\d+(?:\.\d+)?)\}$/.exec(unsigned);
  if (match) {
    return sign / Number(match[1]);
  }
  match = /^\\frac\{(\d+(?:\.\d+)?)\\pi\}\{(\d+(?:\.\d+)?)\}$/.exec(unsigned);
  if (match) {
    return sign * Number(match[1]) / Number(match[2]);
  }
  return null;
}

function coefficientLatexForArgument(coefficient: ParsedScalar) {
  if (Math.abs(coefficient.value - 1) < 1e-10) {
    return '';
  }
  if (Math.abs(coefficient.value + 1) < 1e-10) {
    return '-';
  }
  return coefficient.latex;
}

function formatAmplitudeMultiplier(amplitude: ParsedScalar) {
  if (Math.abs(amplitude.value - 1) < 1e-10) {
    return '';
  }
  if (Math.abs(amplitude.value + 1) < 1e-10) {
    return '-';
  }
  return amplitude.latex;
}

function formatSignedScalar(value: ParsedScalar) {
  if (Math.abs(value.value) < 1e-10) {
    return '';
  }
  return value.value < 0 ? value.latex : `+${value.latex}`;
}

function formatLinearTerm(coefficient: ParsedScalar, phaseShiftLatex: string) {
  const coefficientLatex = coefficientLatexForArgument(coefficient);
  if (phaseShiftLatex === '0') {
    return `${coefficientLatex}x`;
  }
  if (phaseShiftLatex.startsWith('-')) {
    return `${coefficientLatex}\\left(x+${phaseShiftLatex.slice(1)}\\right)`;
  }
  return `${coefficientLatex}\\left(x-${phaseShiftLatex}\\right)`;
}

function parseArgument(argumentLatex: string): {
  coefficient: ParsedScalar;
  offsetLatex: string;
  offsetPiCoefficient: number | null;
} | null {
  const xMatches = argumentLatex.match(/x/g) ?? [];
  if (xMatches.length !== 1 || /\^|_\{|[{}]x|x[{}]/.test(argumentLatex)) {
    return null;
  }

  const xIndex = argumentLatex.indexOf('x');
  const coefficientToken = argumentLatex.slice(0, xIndex).replace(/\*$/, '');
  const coefficient = parseScalar(coefficientToken, 1);
  if (!coefficient || Math.abs(coefficient.value) < 1e-10) {
    return null;
  }

  const offsetLatex = argumentLatex.slice(xIndex + 1);
  if (offsetLatex.includes('x') || (offsetLatex && !/^[+-]/.test(offsetLatex))) {
    return null;
  }

  const offsetPiCoefficient = parsePiCoefficient(offsetLatex);
  return {
    coefficient,
    offsetLatex,
    offsetPiCoefficient,
  };
}

function parsePeriodPhaseExpression(source: string): ParsedPeriodPhase | null {
  const normalized = normalizeLatex(source);
  if (!normalized || /(?:=|<|>|\\leq?|\\geq?|\\neq?)/.test(normalized)) {
    return null;
  }
  if (/(?:\\?sin|\\?cos|\\?tan)\s*\^/.test(normalized) || /\\abs|\||piecewise/i.test(normalized)) {
    return null;
  }

  const functionMatches = [...normalized.matchAll(/(\\?sin|\\?cos|\\?tan)\(/g)];
  if (functionMatches.length !== 1) {
    return null;
  }

  const match = functionMatches[0];
  const carrier = match[1].replace('\\', '') as TrigCarrier;
  const functionStart = match.index ?? 0;
  const openIndex = functionStart + match[1].length;
  const closeIndex = findMatchingParen(normalized, openIndex);
  if (closeIndex < 0) {
    return null;
  }

  const prefix = normalized.slice(0, functionStart);
  const suffix = normalized.slice(closeIndex + 1);
  const amplitude = parseScalar(prefix, 1);
  const verticalShift = parseSignedShift(suffix);
  if (!amplitude || !verticalShift) {
    return null;
  }

  const argumentLatex = normalized.slice(openIndex + 1, closeIndex);
  if (/(\\?sin|\\?cos|\\?tan)\(/.test(argumentLatex)) {
    return null;
  }
  const argument = parseArgument(argumentLatex);
  if (!argument) {
    return null;
  }

  return {
    carrier,
    amplitude,
    verticalShift,
    argumentLatex,
    ...argument,
  };
}

function unitValueToDegrees(value: number, unit: AngleUnit) {
  if (unit === 'deg') {
    return value;
  }
  if (unit === 'rad') {
    return value * 180 / Math.PI;
  }
  return value * 0.9;
}

function phaseShiftDegrees(parsed: ParsedPeriodPhase, angleUnit: AngleUnit): number | null {
  if (!parsed.offsetLatex) {
    return 0;
  }
  if (parsed.offsetPiCoefficient !== null) {
    return -parsed.offsetPiCoefficient * 180 / parsed.coefficient.value;
  }
  const offsetScalar = parseScalar(parsed.offsetLatex);
  if (offsetScalar) {
    return unitValueToDegrees(-offsetScalar.value / parsed.coefficient.value, angleUnit);
  }
  return null;
}

function phaseShiftLatex(parsed: ParsedPeriodPhase, angleUnit: AngleUnit) {
  const degrees = phaseShiftDegrees(parsed, angleUnit);
  if (degrees !== null) {
    return formatDegreesAsUnitLatex(degrees, angleUnit);
  }
  return `-\\frac{${parsed.offsetLatex}}{${parsed.coefficient.latex}}`;
}

function formatRange(parsed: ParsedPeriodPhase) {
  if (parsed.carrier === 'tan') {
    return '\\mathbb{R}';
  }
  const amplitude = Math.abs(parsed.amplitude.value);
  const lower = parsed.verticalShift.value - amplitude;
  const upper = parsed.verticalShift.value + amplitude;
  return `\\left[${formatNumber(lower)},${formatNumber(upper)}\\right]`;
}

function normalizedWaveLatex(parsed: ParsedPeriodPhase, phaseLatex: string) {
  const amplitudeLatex = formatAmplitudeMultiplier(parsed.amplitude);
  const argument = formatLinearTerm(parsed.coefficient, phaseLatex);
  const verticalShift = formatSignedScalar(parsed.verticalShift);
  return `${amplitudeLatex}\\${parsed.carrier}\\left(${argument}\\right)${verticalShift}`;
}

function periodLatex(parsed: ParsedPeriodPhase, angleUnit: AngleUnit) {
  return formatDegreesAsUnitLatex(periodDegrees(parsed), angleUnit);
}

function periodDegrees(parsed: ParsedPeriodPhase) {
  const baseDegrees = parsed.carrier === 'tan' ? 180 : 360;
  return baseDegrees / Math.abs(parsed.coefficient.value);
}

function waveFacts(
  parsed: ParsedPeriodPhase,
  phaseLatex: string,
  period: string,
  angleUnit: AngleUnit,
) {
  const phaseDegrees = phaseShiftDegrees(parsed, angleUnit);
  const periodInDegrees = periodDegrees(parsed);
  const asymptoteLatex = phaseDegrees !== null
    ? `${formatDegreesAsUnitLatex(phaseDegrees - periodInDegrees / 2, angleUnit)},\\ ${formatDegreesAsUnitLatex(phaseDegrees + periodInDegrees / 2, angleUnit)}`
    : `${phaseLatex}\\pm\\frac{${period}}{2}`;
  const facts = [
    `\\text{carrier}=\\${parsed.carrier}`,
    `B=${parsed.coefficient.latex}`,
    `\\text{period}=${period}`,
    `\\text{phase shift}=${phaseLatex}`,
    `\\text{vertical shift}=${parsed.verticalShift.latex}`,
  ];

  if (parsed.carrier === 'tan') {
    facts.push('\\text{amplitude does not apply to tangent}');
    facts.push(`\\text{range}=\\mathbb{R}`);
    facts.push(`\\text{asymptotes}: x=${asymptoteLatex}`);
    return facts;
  }

  facts.splice(1, 0, `\\text{amplitude}=${formatNumber(Math.abs(parsed.amplitude.value))}`);
  facts.push(`\\text{midline}: y=${parsed.verticalShift.latex}`);
  facts.push(`\\text{range}=${formatRange(parsed)}`);
  return facts;
}

function landmarkFacts(
  parsed: ParsedPeriodPhase,
  phaseLatex: string,
  period: string,
  angleUnit: AngleUnit,
) {
  const phaseDegrees = phaseShiftDegrees(parsed, angleUnit);
  const periodInDegrees = periodDegrees(parsed);
  if (parsed.carrier === 'tan') {
    if (phaseDegrees !== null) {
      return [
        `x_0=${formatDegreesAsUnitLatex(phaseDegrees, angleUnit)}`,
        `\\text{one-cycle window}: ${formatDegreesAsUnitLatex(phaseDegrees - periodInDegrees / 2, angleUnit)}<x<${formatDegreesAsUnitLatex(phaseDegrees + periodInDegrees / 2, angleUnit)}`,
        `\\text{asymptotes}: x=${formatDegreesAsUnitLatex(phaseDegrees - periodInDegrees / 2, angleUnit)},\\ ${formatDegreesAsUnitLatex(phaseDegrees + periodInDegrees / 2, angleUnit)}`,
      ];
    }
    return [
      `x_0=${phaseLatex}`,
      `\\text{one-cycle window}: ${phaseLatex}-\\frac{${period}}{2}<x<${phaseLatex}+\\frac{${period}}{2}`,
      `\\text{asymptotes}: x=${phaseLatex}\\pm\\frac{${period}}{2}`,
    ];
  }

  if (phaseDegrees !== null) {
    return [
      `x_0=${formatDegreesAsUnitLatex(phaseDegrees, angleUnit)}`,
      `x_1=${formatDegreesAsUnitLatex(phaseDegrees + periodInDegrees / 4, angleUnit)}`,
      `x_2=${formatDegreesAsUnitLatex(phaseDegrees + periodInDegrees / 2, angleUnit)}`,
      `x_3=${formatDegreesAsUnitLatex(phaseDegrees + 3 * periodInDegrees / 4, angleUnit)}`,
      `x_4=${formatDegreesAsUnitLatex(phaseDegrees + periodInDegrees, angleUnit)}`,
    ];
  }

  return [
    `x_0=${phaseLatex}`,
    `x_1=${phaseLatex}+\\frac{${period}}{4}`,
    `x_2=${phaseLatex}+\\frac{${period}}{2}`,
    `x_3=${phaseLatex}+\\frac{3${period}}{4}`,
    `x_4=${phaseLatex}+${period}`,
  ];
}

export function analyzePeriodPhase(
  expressionLatex: string,
  angleUnit: AngleUnit,
): TrigEvaluation {
  const parsed = parsePeriodPhaseExpression(expressionLatex);
  if (!parsed) {
    return {
      error: PERIOD_PHASE_ERROR,
      warnings: [],
    };
  }

  const phase = phaseShiftLatex(parsed, angleUnit);
  const period = periodLatex(parsed, angleUnit);
  const normalized = normalizedWaveLatex(parsed, phase);
  const phaseDegrees = phaseShiftDegrees(parsed, angleUnit);
  const periodInDegrees = periodDegrees(parsed);
  const mathJsonLeaves = [
    {
      canonicalLatex: `B=${parsed.coefficient.latex}`,
      mathJson: ['Equal', 'B', parsed.coefficient.value],
      source: 'trigonometry.period-phase:native-frequency-coefficient',
    },
    ...(phaseDegrees === null || parsed.carrier === 'tan'
      ? []
      : Array.from({ length: 5 }, (_, index) => {
          const degrees = phaseDegrees + index * periodInDegrees / 4;
          return {
            canonicalLatex: `x_${index}=${formatDegreesAsUnitLatex(degrees, angleUnit)}`,
            mathJson: ['Equal', `x_${index}`, degreesToUnitMathJson(degrees, angleUnit)],
            source: `trigonometry.period-phase:native-landmark-${index}`,
          };
        })),
  ];
  return profileTrigonometryResult({
    exactLatex: `y=${normalized},\\quad P=${period},\\quad h=${phase}`,
    approxText: `Carrier ${parsed.carrier}; period ${period}; phase shift ${phase}.`,
    warnings: [],
    detailSections: [
      mathDetailSection('Wave Facts', waveFacts(parsed, phase, period, angleUnit)),
      mathDetailSection('First Cycle Landmarks', landmarkFacts(parsed, phase, period, angleUnit)),
    ],
    mathJsonLeaves,
  });
}
