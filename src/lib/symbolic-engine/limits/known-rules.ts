import { isNodeArray } from '../patterns';
import {
  box,
  evaluateNodeAt,
  isEquivalentNode,
  isZeroish,
} from './evaluation';
import {
  formatLimitNumberLatex,
  limitMathPart,
  limitMethodRowsSection,
  limitTextPart,
} from './detail-readback';
import { profileSymbolicLimitsResult } from '../../display/printer';

type KnownLimitInner = {
  inner: unknown;
  standardLatex: string;
  value: number;
};

function isNumericOne(node: unknown) {
  return node === 1;
}

function isNumericMinusOne(node: unknown) {
  return node === -1;
}

export function matchOnePlus(node: unknown) {
  if (!isNodeArray(node) || node[0] !== 'Add') {
    return null;
  }

  const terms = node.slice(1);
  const oneIndex = terms.findIndex(isNumericOne);
  if (oneIndex === -1 || terms.length !== 2) {
    return null;
  }

  return terms[1 - oneIndex];
}

export function matchFunctionMinusOne(node: unknown, functionHead: string) {
  if (!isNodeArray(node) || node[0] !== 'Add') {
    return null;
  }

  const terms = node.slice(1);
  if (terms.length !== 2 || !terms.some(isNumericMinusOne)) {
    return null;
  }

  const functionTerm = terms.find((term) =>
    isNodeArray(term)
    && term[0] === functionHead
    && term.length === 2);

  return isNodeArray(functionTerm) ? functionTerm[1] : null;
}

export function matchExpMinusOne(node: unknown) {
  if (!isNodeArray(node) || node[0] !== 'Add') {
    return null;
  }

  const terms = node.slice(1);
  if (terms.length !== 2 || !terms.some(isNumericMinusOne)) {
    return null;
  }

  const expTerm = terms.find((term) =>
    isNodeArray(term)
    && term[0] === 'Power'
    && term.length === 3
    && term[1] === 'ExponentialE');

  return isNodeArray(expTerm) ? expTerm[2] : null;
}

export function matchOneMinusFunction(node: unknown, functionHead: string) {
  if (!isNodeArray(node) || node[0] !== 'Add') {
    return null;
  }

  const terms = node.slice(1);
  if (terms.length !== 2 || !terms.some(isNumericOne)) {
    return null;
  }

  const negatedFunction = terms.find((term) =>
    isNodeArray(term)
    && term[0] === 'Negate'
    && term.length === 2
    && isNodeArray(term[1])
    && term[1][0] === functionHead
    && term[1].length === 2);

  return isNodeArray(negatedFunction) && isNodeArray(negatedFunction[1])
    ? negatedFunction[1][1]
    : null;
}

function matchKnownLimitInner(
  node: unknown,
  denominator: unknown,
  target: number,
  variable: string,
): KnownLimitInner | undefined {
  if (isNodeArray(node) && (node[0] === 'Sin' || node[0] === 'Tan') && node.length === 2) {
    const inner = node[1];
    const functionLatex = node[0] === 'Sin' ? '\\sin' : '\\tan';
    return isEquivalentNode(denominator, inner) && isZeroish(evaluateNodeAt(inner, target, variable))
      ? {
          inner,
          standardLatex: `\\frac{${functionLatex}(u)}{u}\\to 1`,
          value: 1,
        }
      : undefined;
  }

  const cosineInner = matchOneMinusFunction(node, 'Cos');
  if (
    cosineInner
    && isEquivalentNode(denominator, ['Power', cosineInner, 2])
    && isZeroish(evaluateNodeAt(cosineInner, target, variable))
  ) {
    return {
      inner: cosineInner,
      standardLatex: '\\frac{1-\\cos(u)}{u^2}\\to \\frac{1}{2}',
      value: 0.5,
    };
  }

  const expInner = matchExpMinusOne(node);
  if (
    expInner
    && isEquivalentNode(denominator, expInner)
    && isZeroish(evaluateNodeAt(expInner, target, variable))
  ) {
    return {
      inner: expInner,
      standardLatex: '\\frac{e^u-1}{u}\\to 1',
      value: 1,
    };
  }

  if (isNodeArray(node) && node[0] === 'Ln' && node.length === 2) {
    const inner = matchOnePlus(node[1]);
    if (inner && isEquivalentNode(denominator, inner) && isZeroish(evaluateNodeAt(inner, target, variable))) {
      return {
        inner,
        standardLatex: '\\frac{\\ln(1+u)}{u}\\to 1',
        value: 1,
      };
    }
  }

  const sqrtArgument = matchFunctionMinusOne(node, 'Sqrt');
  const sqrtInner = sqrtArgument ? matchOnePlus(sqrtArgument) : null;
  if (
    sqrtInner
    && isEquivalentNode(denominator, sqrtInner)
    && isZeroish(evaluateNodeAt(sqrtInner, target, variable))
  ) {
    return {
      inner: sqrtInner,
      standardLatex: '\\frac{\\sqrt{1+u}-1}{u}\\to \\frac{1}{2}',
      value: 0.5,
    };
  }

  return undefined;
}

function latexOf(node: unknown) {
  try {
    return box(node).latex;
  } catch {
    return '?';
  }
}

export function resolveKnownFiniteLimitRule(node: unknown, target: number, variable: string) {
  if (!isNodeArray(node) || node[0] !== 'Divide' || node.length !== 3) {
    return undefined;
  }

  const match = matchKnownLimitInner(node[1], node[2], target, variable);
  if (!match) {
    return undefined;
  }

  const valueLatex = formatLimitNumberLatex(match.value);
  const targetLatex = formatLimitNumberLatex(target);
  const innerLatex = latexOf(match.inner);
  return profileSymbolicLimitsResult({
    kind: 'success' as const,
    value: match.value,
    exactLatex: valueLatex,
    approxText: `${match.value}`,
    origin: 'rule-based-symbolic' as const,
    detailSections: limitMethodRowsSection([
      [limitTextPart('Form detected: standard substitution/composition limit.')],
      [
        limitTextPart('Inner limit: '),
        limitMathPart(`u=${innerLatex}`),
        limitTextPart(' and '),
        limitMathPart(`\\lim_{${variable}\\to ${targetLatex}}u=0`),
        limitTextPart('.'),
      ],
      [
        limitTextPart('Standard equivalent: '),
        limitMathPart(match.standardLatex),
        limitTextPart('.'),
      ],
      [
        limitTextPart('Conclusion: the composed quotient tends to '),
        limitMathPart(valueLatex),
        limitTextPart('.'),
      ],
    ]),
  });
}
