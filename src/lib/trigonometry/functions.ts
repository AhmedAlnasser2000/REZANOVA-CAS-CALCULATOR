import type { AngleUnit } from '../../types/calculator';
import { formatApproxNumber, formatNumber } from '../display/format';
import { exactInverseTrigDegrees } from '../numeric/inverse-trig-special-values';
import {
  type TrigEvaluation,
  convertAngle,
  evaluateSpecialTrig,
  formatDegreesAsUnitLatex,
  parseAngleInput,
  parseSupportedRatio,
} from './angles';
import { profileTrigonometryResult } from '../display/printer';

const EPSILON = 1e-9;

type TrigFunctionKind = 'sin' | 'cos' | 'tan' | 'asin' | 'acos' | 'atan';

function normalizeLatex(latex: string) {
  return latex
    .trim()
    .replace(/\s+/g, '')
    .replaceAll('\\left', '')
    .replaceAll('\\right', '');
}

function parseFunctionExpression(latex: string) {
  const normalized = normalizeLatex(latex);
  const match = normalized.match(/^(\\sin|\\cos|\\tan|\\arcsin|\\arccos|\\arctan)\((.+)\)$/);
  if (!match) {
    return undefined;
  }

  const name = match[1] === '\\sin'
    ? 'sin'
    : match[1] === '\\cos'
      ? 'cos'
      : match[1] === '\\tan'
        ? 'tan'
        : match[1] === '\\arcsin'
          ? 'asin'
          : match[1] === '\\arccos'
            ? 'acos'
            : 'atan';

  return { kind: name as TrigFunctionKind, argumentLatex: match[2] };
}

function toNumericTrigResult(kind: 'sin' | 'cos' | 'tan', degrees: number): TrigEvaluation {
  const radians = convertAngle(degrees, 'deg', 'rad');
  const value = kind === 'sin' ? Math.sin(radians) : kind === 'cos' ? Math.cos(radians) : Math.tan(radians);
  if (!Number.isFinite(value)) {
    return {
      error: 'This angle makes the selected trig function undefined.',
      warnings: [],
    };
  }

  return profileTrigonometryResult({
    exactLatex: formatNumber(value),
    approxText: formatApproxNumber(value),
    warnings: [],
    resultOrigin: 'numeric',
  });
}

function evaluateDirectTrig(kind: 'sin' | 'cos' | 'tan', argumentLatex: string, angleUnit: AngleUnit): TrigEvaluation {
  const degrees = parseAngleInput(argumentLatex, angleUnit);
  if (degrees === null) {
    return {
      error: 'Enter a numeric angle or a supported special-angle form before evaluating.',
      warnings: [],
    };
  }

  const exact = evaluateSpecialTrig(kind, degrees);
  if (exact === '\\text{undefined}') {
    return {
      error: 'This angle makes the selected trig function undefined.',
      warnings: [],
    };
  }

  const numeric = toNumericTrigResult(kind, degrees);
  if (exact) {
    return profileTrigonometryResult({
      exactLatex: exact,
      approxText: numeric.approxText,
      warnings: [`Angle unit: ${angleUnit.toUpperCase()}.`],
      resultOrigin: 'exact-special-angle',
    });
  }

  return {
    ...numeric,
    warnings: [`Angle unit: ${angleUnit.toUpperCase()}.`],
  };
}

function evaluateInverseTrig(kind: 'asin' | 'acos' | 'atan', argumentLatex: string, angleUnit: AngleUnit): TrigEvaluation {
  const value = parseSupportedRatio(argumentLatex);
  if (value === null) {
    return {
      error: 'Enter a numeric value or a supported exact ratio before evaluating the inverse function.',
      warnings: [],
    };
  }

  if ((kind === 'asin' || kind === 'acos') && (value < -1 - EPSILON || value > 1 + EPSILON)) {
    return {
      error: 'asin and acos require an input between -1 and 1.',
      warnings: [],
    };
  }

  const exactDegrees = exactInverseTrigDegrees(kind, value);
  if (exactDegrees !== undefined) {
    return profileTrigonometryResult({
      exactLatex: formatDegreesAsUnitLatex(exactDegrees, angleUnit),
      approxText: formatApproxNumber(convertAngle(exactDegrees, 'deg', angleUnit)),
      warnings: ['Principal value returned.'],
      resultOrigin: 'exact-special-angle',
    });
  }

  const radians = kind === 'asin'
    ? Math.asin(value)
    : kind === 'acos'
      ? Math.acos(value)
      : Math.atan(value);
  const numeric = convertAngle(radians, 'rad', angleUnit);

  return profileTrigonometryResult({
    exactLatex: formatNumber(numeric),
    approxText: formatApproxNumber(numeric),
    warnings: ['Principal value returned.'],
    resultOrigin: 'numeric',
  });
}

export function evaluateTrigFunction(expressionLatex: string, angleUnit: AngleUnit): TrigEvaluation {
  const parsed = parseFunctionExpression(expressionLatex);
  if (!parsed) {
    return {
      error: 'Use a single supported trig expression such as sin(30), cos(pi/3), or asin(1/2).',
      warnings: [],
    };
  }

  if (parsed.kind === 'sin' || parsed.kind === 'cos' || parsed.kind === 'tan') {
    return evaluateDirectTrig(parsed.kind, parsed.argumentLatex, angleUnit);
  }

  return evaluateInverseTrig(parsed.kind, parsed.argumentLatex, angleUnit);
}
