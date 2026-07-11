import { convertAngle, formatAngleLatex } from '../../trigonometry/angles';
import { formatNumber } from '../../display/format';
import {
  ROOT_EPSILON,
  TRIG_EPSILON,
  type AngleUnit,
  type NumericPeriodicSet,
  type OutputStyle,
  type TrigFunctionKind,
} from './type-imports';
import { normalizePeriodicNumber } from './periodic-math';
import { profileEquationResult } from '../../display/printer';

function formatPeriodicBound(valueDegrees: number, affine: { a: number; b: number }, unit: AngleUnit) {
  const boundInUnit = convertAngle(valueDegrees, 'deg', unit);
  const xValue = (boundInUnit - affine.b) / affine.a;
  return formatAngleLatex(xValue, unit);
}

function formatAngleDecimalLatex(value: number, unit: AngleUnit) {
  if (unit === 'deg') {
    return `${formatNumber(value)}^{\\circ}`;
  }
  return formatNumber(value);
}

function isPlainDecimalLatex(latex: string) {
  return /^-?\d+(?:\.\d+)?$/.test(latex.trim());
}

function formatNumericForLatex(value: number) {
  return formatNumber(value);
}

function signedTargetFreeTermLatex(value: number) {
  if (Math.abs(value) <= ROOT_EPSILON) {
    return '';
  }
  return value > 0 ? `+${formatNumericForLatex(value)}` : `${formatNumericForLatex(value)}`;
}

function combineAffineShiftLatex(argumentLatex: string, shift: number) {
  const argument = argumentLatex.trim();
  if (Math.abs(shift) <= ROOT_EPSILON) {
    return argument;
  }

  const shiftLatex = formatNumericForLatex(shift);
  if (argument === '0') {
    return shiftLatex;
  }
  if (shift > 0) {
    if (argument.startsWith('-')) {
      return `${shiftLatex}${argument}`;
    }
    return `${shiftLatex}+${argument}`;
  }
  return `${argument}${signedTargetFreeTermLatex(shift)}`;
}

function divideLatexByCoefficient(numeratorLatex: string, coefficient: number) {
  if (Math.abs(coefficient - 1) <= ROOT_EPSILON) {
    return numeratorLatex;
  }
  if (Math.abs(coefficient + 1) <= ROOT_EPSILON) {
    return numeratorLatex.startsWith('-') ? numeratorLatex.slice(1) : `-${numeratorLatex}`;
  }

  const numericMatch = numeratorLatex.trim().match(/^(-?\d+(?:\.\d+)?)$/);
  if (numericMatch) {
    return formatNumericForLatex(Number(numericMatch[1]) / coefficient);
  }

  const degreeMatch = numeratorLatex.trim().match(/^(-?\d+(?:\.\d+)?)\^\{\\circ\}$/);
  if (degreeMatch) {
    return `${formatNumericForLatex(Number(degreeMatch[1]) / coefficient)}^{\\circ}`;
  }

  const piMatch = numeratorLatex.trim().match(/^(-?\d*)\\pi$/);
  if (piMatch) {
    const rawCoefficient = piMatch[1];
    const piCoefficient = !rawCoefficient || rawCoefficient === '+'
      ? 1
      : rawCoefficient === '-'
        ? -1
        : Number(rawCoefficient);
    const divided = piCoefficient / coefficient;
    if (Math.abs(divided - 1) <= ROOT_EPSILON) {
      return '\\pi';
    }
    if (Math.abs(divided + 1) <= ROOT_EPSILON) {
      return '-\\pi';
    }
    if (Number.isInteger(divided)) {
      return `${formatNumericForLatex(divided)}\\pi`;
    }
    if (Math.abs(piCoefficient) === 1 && Number.isInteger(coefficient)) {
      return piCoefficient > 0
        ? `\\frac{\\pi}{${formatNumericForLatex(coefficient)}}`
        : `-\\frac{\\pi}{${formatNumericForLatex(coefficient)}}`;
    }
  }

  return `\\frac{${numeratorLatex}}{${formatNumericForLatex(coefficient)}}`;
}

function affinePreimageBoundLatex(argumentBoundLatex: string, affine: { a: number; b: number }) {
  const shifted = combineAffineShiftLatex(argumentBoundLatex, -affine.b);
  return divideLatexByCoefficient(shifted, affine.a);
}

function thresholdLatexForExactReadback(rawLatex: string) {
  return rawLatex.trim() || formatNumericForLatex(0);
}

function maybeParenthesizedSum(latex: string) {
  return /[+-]/.test(latex.replace(/^-/, '')) ? `\\left(${latex}\\right)` : latex;
}

function formatTrigEndpointArgumentLatex(input: {
  kind: TrigFunctionKind;
  threshold: number;
  thresholdLatex: string;
  valueInUnit: number;
  angleUnit: AngleUnit;
  outputStyle: OutputStyle;
}) {
  if (input.outputStyle === 'decimal') {
    return formatAngleDecimalLatex(input.valueInUnit, input.angleUnit);
  }

  const formatted = formatAngleLatex(input.valueInUnit, input.angleUnit);
  if (!isPlainDecimalLatex(formatted)) {
    return formatted;
  }

  const valueRadians = convertAngle(input.valueInUnit, input.angleUnit, 'rad');
  const thresholdLatex = thresholdLatexForExactReadback(input.thresholdLatex);
  const asin = Math.asin(Math.max(-1, Math.min(1, input.threshold)));
  const acos = Math.acos(Math.max(-1, Math.min(1, input.threshold)));
  const atan = Math.atan(input.threshold);
  const candidates: Array<{ value: number; latex: string }> = [];

  if (input.kind === 'sin') {
    const alpha = `\\arcsin\\left(${thresholdLatex}\\right)`;
    candidates.push(
      { value: asin, latex: alpha },
      { value: Math.PI - asin, latex: `\\pi-${maybeParenthesizedSum(alpha)}` },
      { value: 2 * Math.PI + asin, latex: `2\\pi+${maybeParenthesizedSum(alpha)}` },
    );
  } else if (input.kind === 'cos') {
    const alpha = `\\arccos\\left(${thresholdLatex}\\right)`;
    candidates.push(
      { value: acos, latex: alpha },
      { value: -acos, latex: `-${maybeParenthesizedSum(alpha)}` },
      { value: 2 * Math.PI - acos, latex: `2\\pi-${maybeParenthesizedSum(alpha)}` },
    );
  } else {
    const alpha = `\\arctan\\left(${thresholdLatex}\\right)`;
    candidates.push(
      { value: atan, latex: alpha },
      { value: Math.PI - atan, latex: `\\pi-${maybeParenthesizedSum(alpha)}` },
      { value: Math.PI + atan, latex: `\\pi+${maybeParenthesizedSum(alpha)}` },
      { value: Math.PI / 2, latex: '\\frac{\\pi}{2}' },
      { value: -Math.PI / 2, latex: '-\\frac{\\pi}{2}' },
    );
  }

  for (const candidate of candidates) {
    if (Math.abs(valueRadians - candidate.value) <= 1e-8) {
      return candidate.latex;
    }
  }

  return formatted;
}

function buildTrigPreimageBoundFormatter(input: {
  kind: TrigFunctionKind;
  threshold: number;
  thresholdLatex: string;
  affine: { a: number; b: number };
  angleUnit: AngleUnit;
  outputStyle: OutputStyle;
  argumentPeriod?: number;
}) {
  return (targetValue: number) => {
    const rawArgumentValue = input.affine.a * targetValue + input.affine.b;
    const argumentValue = input.argumentPeriod
      ? normalizePeriodicNumber(rawArgumentValue, input.argumentPeriod)
      : rawArgumentValue;
    const argumentLatex = formatTrigEndpointArgumentLatex({
      kind: input.kind,
      threshold: input.threshold,
      thresholdLatex: input.thresholdLatex,
      valueInUnit: argumentValue,
      angleUnit: input.angleUnit,
      outputStyle: input.outputStyle,
    });
    if (input.outputStyle === 'decimal') {
      return formatAngleDecimalLatex(targetValue, input.angleUnit);
    }
    return affinePreimageBoundLatex(argumentLatex, input.affine);
  };
}

function periodFactLatex(periodLatex: string) {
  return `\\text{Period: } ${periodLatex}`;
}

function periodicShiftLatex(periodLatex: string) {
  const normalized = periodLatex.trim();
  if (normalized === '\\pi') {
    return 'k\\pi';
  }
  let match = normalized.match(/^(\d+)\\pi$/);
  if (match) {
    return `${match[1]}k\\pi`;
  }
  match = normalized.match(/^\\frac\{\\pi\}\{([^{}]+)\}$/);
  if (match) {
    return `\\frac{k\\pi}{${match[1]}}`;
  }
  match = normalized.match(/^\\frac\{(\d+)\\pi\}\{([^{}]+)\}$/);
  if (match) {
    return `\\frac{${match[1]}k\\pi}{${match[2]}}`;
  }
  return `k\\cdot ${normalized}`;
}

function indexedPeriodicShiftLatex(periodLatex: string, indexSymbol = 'n') {
  return periodicShiftLatex(periodLatex).replaceAll('k', indexSymbol);
}

function negateLatex(latex: string) {
  const normalized = latex.trim();
  if (normalized === '0') {
    return '0';
  }
  if (normalized.startsWith('-')) {
    return normalized.slice(1);
  }
  return `-${maybeParenthesizedSum(normalized)}`;
}

function appendIndexedShiftLatex(boundLatex: string, shiftLatex: string) {
  if (boundLatex === '0') {
    return shiftLatex;
  }
  if (shiftLatex.startsWith('-')) {
    return `${boundLatex}${shiftLatex}`;
  }
  return `${boundLatex}+${shiftLatex}`;
}

function latexFragmentToReadableText(latex: string) {
  let readable = latex;
  let previous = '';
  while (previous !== readable) {
    previous = readable;
    readable = readable.replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, '($1)/($2)');
  }
  return readable
    .replaceAll('\\;', ' ')
    .replaceAll('\\cup', 'or')
    .replaceAll('\\le', '<=')
    .replaceAll('\\ge', '>=')
    .replaceAll('\\ne', '!=')
    .replaceAll('\\frac{k\\pi}', 'k*pi')
    .replaceAll('\\frac{n\\pi}', 'n*pi')
    .replaceAll('\\pi', 'pi')
    .replaceAll('\\left', '')
    .replaceAll('\\right', '')
    .replaceAll('\\cdot', '*')
    .replaceAll('{', '')
    .replaceAll('}', '')
    .replace(/\s+/g, ' ')
    .trim();
}

function absAffineFamilyPeriodShift(input: {
  periodLatex: string;
  affine: { a: number; b: number };
  sign: 1 | -1;
}) {
  const periodStep = divideLatexByCoefficient(input.periodLatex, Math.abs(input.affine.a));
  const shift = indexedPeriodicShiftLatex(periodStep, 'n');
  return input.sign > 0 ? shift : `-${shift}`;
}

function formatFamilyInterval(input: {
  variable: string;
  lowerLatex: string;
  lowerInclusive: boolean;
  upperLatex: string;
  upperInclusive: boolean;
  shiftLatex: string;
}) {
  const lowerOperator = input.lowerInclusive ? '\\le ' : '<';
  const upperOperator = input.upperInclusive ? '\\le ' : '<';
  return `${appendIndexedShiftLatex(input.lowerLatex, input.shiftLatex)}${lowerOperator}${input.variable}${upperOperator}${appendIndexedShiftLatex(input.upperLatex, input.shiftLatex)}`;
}

function absAffineTangentSingularityLatex(input: {
  target: string;
  affine: { a: number; b: number };
  unit: AngleUnit;
}) {
  const singularity = formatAngleLatex(convertAngle(90, 'deg', input.unit), input.unit);
  const period = formatAngleLatex(convertAngle(180, 'deg', input.unit), input.unit);
  const positiveBase = affinePreimageBoundLatex(singularity, input.affine);
  const negativeBase = affinePreimageBoundLatex(negateLatex(singularity), input.affine);
  const positiveShift = absAffineFamilyPeriodShift({ periodLatex: period, affine: input.affine, sign: 1 });
  const negativeShift = absAffineFamilyPeriodShift({ periodLatex: period, affine: input.affine, sign: -1 });
  return [
    `${input.target}\\ne${appendIndexedShiftLatex(positiveBase, positiveShift)}`,
    `${input.target}\\ne${appendIndexedShiftLatex(negativeBase, negativeShift)}`,
  ];
}

function buildAbsAffinePeriodicReadback(input: {
  set: NumericPeriodicSet;
  kind: TrigFunctionKind;
  threshold: number;
  thresholdLatex: string;
  affine: { a: number; b: number };
  target: string;
  angleUnit: AngleUnit;
  outputStyle: OutputStyle;
}) {
  const periodLatex = formatAngleLatex(input.set.period / Math.abs(input.affine.a), input.angleUnit);
  const normalizeEndpoint = (value: number) => {
    if (Math.abs(value - input.set.period) <= TRIG_EPSILON) {
      return input.set.period;
    }
    return normalizePeriodicNumber(value, input.set.period);
  };
  const argumentBoundLatex = (value: number, outputStyle: OutputStyle) =>
    formatTrigEndpointArgumentLatex({
      kind: input.kind,
      threshold: input.threshold,
      thresholdLatex: input.thresholdLatex,
      valueInUnit: normalizeEndpoint(value),
      angleUnit: input.angleUnit,
      outputStyle,
    });
  const positiveShift = absAffineFamilyPeriodShift({
    periodLatex: formatAngleLatex(input.set.period, input.angleUnit),
    affine: input.affine,
    sign: 1,
  });
  const negativeShift = absAffineFamilyPeriodShift({
    periodLatex: formatAngleLatex(input.set.period, input.angleUnit),
    affine: input.affine,
    sign: -1,
  });

  const families: string[] = [];
  for (const interval of input.set.intervals) {
    const lowerArgumentLatex = argumentBoundLatex(interval.lower, input.outputStyle);
    const upperArgumentLatex = argumentBoundLatex(interval.upper, input.outputStyle);
    families.push(formatFamilyInterval({
      variable: input.target,
      lowerLatex: affinePreimageBoundLatex(lowerArgumentLatex, input.affine),
      lowerInclusive: interval.lowerInclusive,
      upperLatex: affinePreimageBoundLatex(upperArgumentLatex, input.affine),
      upperInclusive: interval.upperInclusive,
      shiftLatex: positiveShift,
    }));
    families.push(formatFamilyInterval({
      variable: input.target,
      lowerLatex: affinePreimageBoundLatex(negateLatex(upperArgumentLatex), input.affine),
      lowerInclusive: interval.upperInclusive,
      upperLatex: affinePreimageBoundLatex(negateLatex(lowerArgumentLatex), input.affine),
      upperInclusive: interval.lowerInclusive,
      shiftLatex: negativeShift,
    }));
  }

  return profileEquationResult({
    exactLatex: families.join('\\;\\cup\\;'),
    text: input.outputStyle === 'decimal'
      ? `${latexFragmentToReadableText(families.join(' or '))}; n is a nonnegative integer`
      : 'The x-family answer is shown above; n is a nonnegative integer',
    periodLatex,
  });
}


export {
  absAffineTangentSingularityLatex,
  buildAbsAffinePeriodicReadback,
  buildTrigPreimageBoundFormatter,
  formatAngleDecimalLatex,
  formatPeriodicBound,
  periodFactLatex,
  periodicShiftLatex,
};
