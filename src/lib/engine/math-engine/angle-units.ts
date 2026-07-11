import type { EvaluateRequest, SerializableMathJson } from '../../../types/calculator';
import { formatApproxNumber } from '../../display/format';
import {
  exactInverseTrigDegrees,
  type InverseTrigFunction,
} from '../../numeric/inverse-trig-special-values';
import { isMathJsonArray, isNumericOnlyNode } from './math-json';

const DIRECT_TRIG_OPERATORS = new Set(['Sin', 'Cos', 'Tan', 'Sec', 'Csc', 'Cot']);
const INVERSE_TRIG_OPERATORS = new Set(['Arcsin', 'Arccos', 'Arctan']);
const INVERSE_TRIG_KIND: Record<string, InverseTrigFunction> = {
  Arcsin: 'asin',
  Arccos: 'acos',
  Arctan: 'atan',
};

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

function fractionLatex(numerator: number, denominator: number) {
  const divisor = gcd(numerator, denominator);
  const reducedNumerator = numerator / divisor;
  const reducedDenominator = denominator / divisor;
  if (reducedDenominator === 1) {
    return String(reducedNumerator);
  }
  const sign = reducedNumerator < 0 ? '-' : '';
  return `${sign}\\frac{${Math.abs(reducedNumerator)}}{${reducedDenominator}}`;
}

function radianLatex(degrees: number) {
  if (degrees === 0) {
    return '0';
  }
  const divisor = gcd(degrees, 180);
  const numerator = degrees / divisor;
  const denominator = 180 / divisor;
  const sign = numerator < 0 ? '-' : '';
  const absoluteNumerator = Math.abs(numerator);
  const piTerm = absoluteNumerator === 1 ? '\\pi' : `${absoluteNumerator}\\pi`;
  return denominator === 1
    ? `${sign}${piTerm}`
    : `${sign}\\frac{${piTerm}}{${denominator}}`;
}

function exactAngleLatex(degrees: number, angleUnit: EvaluateRequest['angleUnit']) {
  if (angleUnit === 'deg') {
    return String(degrees);
  }
  if (angleUnit === 'rad') {
    return radianLatex(degrees);
  }
  return fractionLatex(degrees * 10, 9);
}

function rationalNode(numerator: number, denominator: number): SerializableMathJson {
  const divisor = gcd(numerator, denominator);
  const reducedNumerator = numerator / divisor;
  const reducedDenominator = denominator / divisor;
  return reducedDenominator === 1
    ? reducedNumerator
    : ['Rational', reducedNumerator, reducedDenominator];
}

function radianNode(degrees: number): SerializableMathJson {
  if (degrees === 0) {
    return 0;
  }

  const divisor = gcd(degrees, 180);
  const numerator = degrees / divisor;
  const denominator = 180 / divisor;
  const absoluteNumerator = Math.abs(numerator);
  const piTerm: SerializableMathJson = absoluteNumerator === 1
    ? 'Pi'
    : ['Multiply', absoluteNumerator, 'Pi'];
  const magnitude: SerializableMathJson = denominator === 1
    ? piTerm
    : ['Divide', piTerm, denominator];
  return numerator < 0 ? ['Negate', magnitude] : magnitude;
}

function exactAngleNode(
  degrees: number,
  angleUnit: EvaluateRequest['angleUnit'],
): SerializableMathJson {
  if (angleUnit === 'deg') {
    return degrees;
  }
  if (angleUnit === 'rad') {
    return radianNode(degrees);
  }
  return rationalNode(degrees * 10, 9);
}

function numericAngleValue(degrees: number, angleUnit: EvaluateRequest['angleUnit']) {
  if (angleUnit === 'deg') {
    return degrees;
  }
  if (angleUnit === 'rad') {
    return degrees * Math.PI / 180;
  }
  return degrees * 10 / 9;
}

function readExactNumericNode(node: unknown): number | undefined {
  if (typeof node === 'number' && Number.isFinite(node)) {
    return node;
  }
  if (typeof node === 'object' && node !== null && 'num' in node) {
    const value = Number((node as { num: string }).num);
    return Number.isFinite(value) ? value : undefined;
  }
  if (!isMathJsonArray(node) || typeof node[0] !== 'string') {
    return undefined;
  }

  const operator = node[0];
  const operands = node.slice(1).map(readExactNumericNode);
  if (operands.some((operand) => operand === undefined)) {
    return undefined;
  }
  const values = operands as number[];
  if (operator === 'Negate' && values.length === 1) return -values[0];
  if ((operator === 'Rational' || operator === 'Divide') && values.length === 2 && values[1] !== 0) {
    return values[0] / values[1];
  }
  if (operator === 'Multiply' && values.length > 0) return values.reduce((product, value) => product * value, 1);
  if (operator === 'Sqrt' && values.length === 1 && values[0] >= 0) return Math.sqrt(values[0]);
  return undefined;
}

export function evaluateExactInverseTrigSpecial(
  node: unknown,
  angleUnit: EvaluateRequest['angleUnit'],
) {
  if (
    !isMathJsonArray(node)
    || node.length !== 2
    || typeof node[0] !== 'string'
    || !INVERSE_TRIG_OPERATORS.has(node[0])
  ) {
    return undefined;
  }

  const kind = INVERSE_TRIG_KIND[node[0]];
  const value = readExactNumericNode(node[1]);
  if (value === undefined) {
    return undefined;
  }
  if ((kind === 'asin' || kind === 'acos') && (value < -1 || value > 1)) {
    return {
      error: 'arcsin and arccos require a real input between -1 and 1.',
    };
  }

  const degrees = exactInverseTrigDegrees(kind, value);
  if (degrees === undefined) {
    return undefined;
  }

  return {
    exactLatex: exactAngleLatex(degrees, angleUnit),
    answerMathJson: exactAngleNode(degrees, angleUnit),
    approxText: formatApproxNumber(numericAngleValue(degrees, angleUnit)),
  };
}

function rewriteTrigArgumentForAngleUnit(argument: unknown, angleUnit: EvaluateRequest['angleUnit']) {
  if (angleUnit === 'deg') {
    return ['Degrees', argument];
  }

  if (angleUnit === 'grad') {
    return ['Divide', ['Multiply', argument, 'Pi'], 200];
  }

  return argument;
}

function rewriteInverseTrigResultForAngleUnit(node: unknown, angleUnit: EvaluateRequest['angleUnit']) {
  if (angleUnit === 'deg') {
    return ['Divide', ['Multiply', node, 180], 'Pi'];
  }

  if (angleUnit === 'grad') {
    return ['Divide', ['Multiply', node, 200], 'Pi'];
  }

  return node;
}

export function rewriteDirectTrigAngles(node: unknown, angleUnit: EvaluateRequest['angleUnit']): unknown {
  if (!isMathJsonArray(node) || node.length === 0) {
    return node;
  }

  const [operator, ...operands] = node;
  const rewrittenOperands = operands.map((operand) => rewriteDirectTrigAngles(operand, angleUnit));

  if (
    typeof operator === 'string'
    && DIRECT_TRIG_OPERATORS.has(operator)
    && rewrittenOperands.length >= 1
    && angleUnit !== 'rad'
    && isNumericOnlyNode(rewrittenOperands[0])
  ) {
    return [
      operator,
      rewriteTrigArgumentForAngleUnit(rewrittenOperands[0], angleUnit),
      ...rewrittenOperands.slice(1),
    ];
  }

  if (
    typeof operator === 'string'
    && INVERSE_TRIG_OPERATORS.has(operator)
    && rewrittenOperands.length >= 1
    && angleUnit !== 'rad'
    && isNumericOnlyNode(rewrittenOperands[0])
  ) {
    return rewriteInverseTrigResultForAngleUnit([operator, ...rewrittenOperands], angleUnit);
  }

  return [operator, ...rewrittenOperands];
}
